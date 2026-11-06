import argparse
import hashlib
import json
import os
import re
import shutil
from pathlib import Path


SOURCE = Path(__file__).resolve().parents[1]
TARGETS = {
    'codex': ('.agents', 'AGENTS.md'),
    'antigravity-cli': ('.agents', 'AGENTS.md'),
    'claude-code': ('.claude', 'CLAUDE.md'),
}
RECEIPT = '.spotter-install.json'
JOURNAL = 'journal.json'
COMMITTED = 'committed.json'
MANAGED_PATH = re.compile(r'\.(?:agents|claude)/(?:bundled-skills|skills/spot-[a-z0-9-]+)')
STAGED_PATH = re.compile(r'(?:old-[0-9]+|new-(?:[0-9]+|receipt)|journal\.tmp)')
BEGIN = b'<!-- spotter:begin -->'
END = b'<!-- spotter:end -->'
MARKER = re.compile(rb'(?m)^(' + BEGIN + rb'|' + END + rb')\r?(?:\n|$)')
TEXT_SUFFIXES = {'.css', '.html', '.js', '.json', '.md', '.mjs', '.py', '.sh', '.svg', '.toml', '.yaml', '.yml'}


class RecoveryRequired(RuntimeError):
    pass


def digest(content):
    return hashlib.sha256(content).hexdigest()


def check_path(path):
    if path.is_symlink() or path.is_junction():
        raise ValueError(f'Linked path requires manual review: {path}')


def tree_digest(directory):
    check_path(directory)
    normalized = {}
    raw = {}
    for path in sorted(directory.iterdir()):
        if path.is_dir():
            normalized[path.name], raw[path.name] = tree_digest(path)
        elif path.is_file():
            check_path(path)
            content = path.read_bytes()
            raw[path.name] = digest(content)
            if path.suffix in TEXT_SUFFIXES or path.name == 'LICENSE':
                content = content.replace(b'\r\n', b'\n')
            normalized[path.name] = digest(content)
        else:
            raise ValueError(f'Unsupported file: {path}')
    return digest(json.dumps(normalized).encode()), digest(json.dumps(raw).encode())


def read_file(path):
    check_path(path)
    return path.read_bytes() if path.exists() else None


def fingerprint(path):
    check_path(path)
    if path.is_dir():
        return tree_digest(path)[1]
    return digest(path.read_bytes()) if path.exists() else None


def managed_path(project, name):
    if name not in ('AGENTS.md', 'CLAUDE.md', RECEIPT) and not MANAGED_PATH.fullmatch(name):
        raise ValueError(f'Invalid managed path: {name}')
    path = project / name
    for part in (path, *path.parents):
        if part == project:
            break
        check_path(part)
    return path


def rollback(project, staging, journal):
    actions = []
    seen = set()
    for index, (name, prepared_name, before, after) in enumerate(journal):
        if name in seen or not re.fullmatch(r'new-(?:[0-9]+|receipt)', prepared_name):
            raise ValueError('Invalid installation journal.')
        seen.add(name)
        path = managed_path(project, name)
        prepared = staging / prepared_name
        backup = staging / f'old-{index}'
        check_path(backup)
        check_path(prepared)
        exists = path.exists()
        replaced = exists and after is not None and not prepared.exists()
        if backup.exists() or (before is None and replaced):
            if exists and (not replaced or fingerprint(path) != after):
                raise ValueError(f'File changed after installation: {path}')
            actions.append((path, prepared, backup, exists))
        elif before is not None and not exists:
            raise ValueError(f'Missing original file and backup: {path}')
    for path, prepared, backup, exists in reversed(actions):
        if exists:
            path.rename(prepared)
        if backup.exists():
            if path.exists() or path.is_symlink():
                raise ValueError(f'File appeared during recovery: {path}')
            backup.rename(path)


def recover(project, staging):
    check_path(staging)
    if not staging.is_dir():
        raise ValueError('No interrupted Spotter installation.')
    for path in staging.iterdir():
        if path.name not in (JOURNAL, COMMITTED) and not STAGED_PATH.fullmatch(path.name):
            raise ValueError(f'Unexpected file in recovery directory: {path}')
    check_path(staging / COMMITTED)
    journal = read_file(staging / JOURNAL)
    if journal is not None:
        rollback(project, staging, json.loads(journal))
        (staging / JOURNAL).rename(staging / COMMITTED)
    elif not (staging / COMMITTED).is_file() and any(staging.glob('old-*')):
        raise ValueError(f'Missing recovery journal. Keep the backups in {staging} for manual recovery.')


def clear_staging(staging):
    # Keep the completion marker until every backup has been cleaned up.
    for path in staging.iterdir():
        if path.name == COMMITTED:
            continue
        if path.is_junction():
            path.rmdir()
        elif path.is_dir() and not path.is_symlink():
            shutil.rmtree(path)
        else:
            path.unlink()
    (staging / COMMITTED).unlink(missing_ok=True)
    staging.rmdir()


def rule_change(path, content, expected, source):
    content.decode('utf-8')
    markers = list(MARKER.finditer(content))
    if content.count(BEGIN) + content.count(END) != len(markers) or (
        markers and [marker[1] for marker in markers] != [BEGIN, END]
    ):
        raise ValueError(f'Invalid Spotter markers: {path}')

    start = markers[0].start() if markers else len(content)
    end = markers[-1].end() if markers else start
    current = digest(content[start:end].replace(b'\r\n', b'\n').rstrip(b'\n')) if markers else None
    if current != expected:
        raise ValueError(f'Unmanaged or locally edited Spotter rules: {path}')
    if source is None:
        return content[:start] + content[end:], None
    if not markers and source.splitlines()[0] in content:
        raise ValueError(f'Possible unmarked Spotter rules: {path}')

    newline = b'\r\n' if b'\r\n' in content else b'\n'
    block = b'\n'.join((BEGIN, source.strip(), END))
    prefix = content[:start]
    if prefix and not prefix.endswith(b'\n'):
        prefix += newline
    return prefix + block.replace(b'\n', newline) + newline + content[end:], digest(block)


def install(project, tools, remove, staging):
    receipt = project / RECEIPT
    receipt_before = read_file(receipt)
    previous = json.loads(receipt_before) if receipt_before is not None else {}
    if receipt_before is not None and (
        not isinstance(previous, dict) or set(previous) != {'tools', 'hashes'}
        or not isinstance(previous['tools'], list) or not isinstance(previous['hashes'], dict)
    ):
        raise ValueError(f'Invalid Spotter installation receipt: {receipt}')
    if remove and not previous:
        raise ValueError('No Spotter installation receipt in this project.')
    selected = sorted(set(previous.get('tools', [])) | set(tools)) or ['codex']
    rules = (SOURCE / 'rules/AGENTS.md').read_bytes().replace(b'\r\n', b'\n')
    skill_dirs = [path.parent for path in sorted((SOURCE / 'skills').glob('*/SKILL.md'))]
    if not skill_dirs:
        raise ValueError('Spotter entry skills are missing from the source checkout.')
    payload = {}
    for folder, rule in sorted({TARGETS[tool] for tool in selected}):
        payload[rule] = rules
        payload[f'{folder}/bundled-skills'] = SOURCE / 'bundled-skills'
        for skill in skill_dirs:
            payload[f'{folder}/skills/{skill.name}'] = skill

    old_hashes = previous.get('hashes', {})
    hashes = {}
    changes = []
    # Stage all changes before touching project files.
    for index, name in enumerate(sorted(payload.keys() | old_hashes.keys())):
        if name not in payload:
            # Entries removed from a later Spotter release must still be managed paths.
            if not re.fullmatch(r'\.(?:agents|claude)/skills/spot-[a-z0-9-]+', name):
                raise ValueError(f'Invalid receipt entry: {name}')
        path = managed_path(project, name)
        expected = old_hashes.get(name)
        source = None if remove else payload.get(name)
        prepared = staging / f'new-{index}'
        if name in ('AGENTS.md', 'CLAUDE.md'):
            before = read_file(path)
            content, new_hash = rule_change(path, before or b'', expected, source)
            if before != content:
                prepared.write_bytes(content)
            before = digest(before) if before is not None else None
        else:
            current, before = tree_digest(path) if path.exists() else (None, None)
            if expected not in (current, before):
                raise ValueError(f'Unmanaged or locally edited skill files: {path}')
            new_hash = tree_digest(source)[0] if source is not None else None
            if current == new_hash:
                if new_hash is not None:
                    hashes[name] = new_hash
                continue
            if source is not None:
                shutil.copytree(source, prepared)
                new_hash = tree_digest(prepared)[0]
        if new_hash is not None:
            hashes[name] = new_hash
        if prepared.exists() or new_hash is None:
            changes.append((path, prepared, before))

    prepared_receipt = staging / 'new-receipt'
    if not remove:
        prepared_receipt.write_text(json.dumps({'tools': selected, 'hashes': hashes}, indent=2) + '\n', encoding='utf-8')
    changes.append((receipt, prepared_receipt, digest(receipt_before) if receipt_before is not None else None))
    journal = [
        (path.relative_to(project).as_posix(), prepared.name, before, fingerprint(prepared))
        for path, prepared, before in changes
    ]
    with (staging / 'journal.tmp').open('w', encoding='utf-8') as output:
        json.dump(journal, output)
        output.flush()
        os.fsync(output.fileno())
    (staging / 'journal.tmp').rename(staging / JOURNAL)
    try:
        for index, (path, prepared, before) in enumerate(changes):
            backup = staging / f'old-{index}'
            managed_path(project, journal[index][0])
            path.parent.mkdir(parents=True, exist_ok=True)
            managed_path(project, journal[index][0])
            if path.exists():
                path.rename(backup)
            if fingerprint(backup) != before:
                raise ValueError(f'File changed during installation: {path}')
            if prepared.exists():
                if path.exists() or path.is_symlink():
                    raise ValueError(f'File appeared during installation: {path}')
                prepared.rename(path)
    except BaseException:
        try:
            rollback(project, staging, journal)
            (staging / JOURNAL).rename(staging / COMMITTED)
        except BaseException as error:
            raise RecoveryRequired(f'Rollback stopped. Backups are in {staging}: {error}') from error
        raise
    (staging / JOURNAL).rename(staging / COMMITTED)


def main():
    parser = argparse.ArgumentParser(description='Install or update Spotter in the current project.')
    parser.add_argument('tools', nargs='*', metavar='TOOL', help=', '.join(TARGETS))
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--remove', action='store_true', help='Remove the managed installation.')
    mode.add_argument('--recover', action='store_true', help='Recover an interrupted installation.')
    args = parser.parse_args()
    if any(tool not in TARGETS for tool in args.tools) or ((args.remove or args.recover) and args.tools):
        parser.error('Choose codex, claude-code, antigravity-cli, --remove, or --recover.')
    project = Path.cwd().resolve()
    if project == SOURCE or project.is_relative_to(SOURCE):
        parser.error('Run this command from the target project, outside the Spotter source checkout.')
    staging = project / '.spotter-install-staging'
    if args.recover:
        try:
            recover(project, staging)
            clear_staging(staging)
        except (OSError, ValueError, TypeError) as error:
            parser.exit(1, f'Spotter could not recover: {error}\n')
        print('Spotter installation recovered.')
        return
    try:
        staging.mkdir()
    except OSError as error:
        hint = ' If no installer is running, use --recover.' if isinstance(error, FileExistsError) else ''
        parser.exit(1, f'Spotter could not start: {error}.{hint}\n')
    preserve_backups = False
    try:
        install(project, args.tools, args.remove, staging)
    except RecoveryRequired as error:
        preserve_backups = True
        parser.exit(1, f'{error}\n')
    except (OSError, ValueError, KeyError, TypeError) as error:
        parser.exit(1, f'Spotter stopped: {error}\n')
    finally:
        if not preserve_backups and staging.resolve() == staging and not (staging / JOURNAL).exists():
            clear_staging(staging)
    print('Spotter removed.' if args.remove else 'Spotter installed. Start a new session to check skill discovery.')


if __name__ == '__main__':
    main()
