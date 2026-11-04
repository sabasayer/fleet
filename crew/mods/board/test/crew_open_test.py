import json
import os
import subprocess
import tempfile
import unittest

BIN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bin", "crew-open")
SYSTEM_PATH = "/usr/bin:/bin"

FAKE_HERDR = """#!/bin/sh
echo "$@" >> "$HERDR_LOG"
if [ "$1" = tab ]; then
  [ -n "$HERDR_FAIL" ] && exit 1
  echo '{"result":{"type":"tab_created","tab":{"tab_id":"t1"},"root_pane":{"pane_id":"p9"}}}'
fi
"""


def git(folder, *args):
    subprocess.run(["git", "-C", folder, *args], check=True, capture_output=True)


class CrewOpen(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.root = os.path.realpath(self.dir.name)
        self.log = os.path.join(self.root, "herdr.log")
        self.fakebin = os.path.join(self.root, "fakebin")
        os.mkdir(self.fakebin)
        self.repo = os.path.join(self.root, "acme")
        os.mkdir(self.repo)
        git(self.repo, "init", "-q", "-b", "main")
        git(self.repo, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "one")
        self.base = subprocess.run(
            ["git", "-C", self.repo, "rev-parse", "HEAD"], capture_output=True, text=True
        ).stdout.strip()
        git(self.repo, "update-ref", "refs/remotes/origin/main", self.base)

    def tearDown(self):
        self.dir.cleanup()

    def add_herdr(self):
        path = os.path.join(self.fakebin, "herdr")
        with open(path, "w") as f:
            f.write(FAKE_HERDR)
        os.chmod(path, 0o755)

    def run_cmd(self, *args, herdr=True, **env):
        if herdr:
            self.add_herdr()
        full = {"PATH": f"{self.fakebin}:{SYSTEM_PATH}", "HERDR_LOG": self.log, **env}
        return subprocess.run([BIN, *args], env=full, capture_output=True, text=True)

    def calls(self):
        if not os.path.exists(self.log):
            return []
        with open(self.log) as f:
            return f.read().splitlines()

    def test_markdown_opens_in_glow_at_git_root(self):
        sub = os.path.join(self.repo, "docs")
        os.mkdir(sub)
        spec = os.path.join(sub, "spec.md")
        open(spec, "w").close()
        r = self.run_cmd(spec)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(
            self.calls(),
            [f"tab create --cwd {self.repo} --label spec.md --no-focus", f"pane run p9 glow -p {spec}"],
        )
        self.assertIn("spec.md", r.stdout)

    def test_other_file_opens_in_helix(self):
        src = os.path.join(self.repo, "main.py")
        open(src, "w").close()
        self.assertEqual(self.run_cmd(src).returncode, 0)
        self.assertEqual(self.calls()[1], f"pane run p9 hx {src}")

    def test_file_outside_git_uses_its_folder(self):
        loose = os.path.join(self.root, "notes.txt")
        open(loose, "w").close()
        self.run_cmd(loose)
        self.assertEqual(self.calls()[0], f"tab create --cwd {self.root} --label notes.txt --no-focus")

    def test_diff_with_base(self):
        r = self.run_cmd("diff", self.repo, "abc123")
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(
            self.calls(),
            [f"tab create --cwd {self.repo} --label diff acme --no-focus", "pane run p9 hunk diff abc123"],
        )

    def test_diff_default_base_is_merge_base_with_origin(self):
        git(self.repo, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "--allow-empty", "-m", "two")
        self.run_cmd("diff", self.repo)
        self.assertEqual(self.calls()[1], f"pane run p9 hunk diff {self.base}")

    def test_no_herdr_prints_runnable_command(self):
        r = self.run_cmd("diff", self.repo, "abc123", herdr=False)
        self.assertEqual(r.returncode, 0)
        self.assertIn(f"cd {self.repo} && hunk diff abc123", r.stdout)
        self.assertEqual(self.calls(), [])

    def test_herdr_failure_prints_command(self):
        r = self.run_cmd("diff", self.repo, "abc123", HERDR_FAIL="1")
        self.assertEqual(r.returncode, 0)
        self.assertIn(f"cd {self.repo} && hunk diff abc123", r.stdout)
        self.assertNotIn("pane run", "\n".join(self.calls()))

    def test_missing_paths_exit_2(self):
        for args in (["diff", "/nope/x"], ["/nope/file.md"], []):
            r = self.run_cmd(*args)
            self.assertEqual(r.returncode, 2, args)
            self.assertTrue(r.stderr, args)
        self.assertEqual(self.calls(), [])


if __name__ == "__main__":
    unittest.main()
