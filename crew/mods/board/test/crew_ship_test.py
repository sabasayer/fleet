import json
import os
import re
import subprocess
import sys
import tempfile
import unittest

BIN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bin")
MR = ["--repo", "/r/app", "--remote", "gitlab.com/g/app", "--worktree", "/w/app", "--branch", "feat/x"]


def run(root, name, args, **env):
    full = {"PATH": os.environ["PATH"], "CREW_BOARD_ROOT": root, "CLAUDE_CODE_SESSION_ID": "first", **env}
    return subprocess.run([os.path.join(BIN, name), *args], env=full, capture_output=True, text=True)


def create(root, *extra):
    return run(root, "crew-ship", ["create", "abc-1", "--title", "Add x", "--fleet", "app", *extra, *MR])


def scout(root, *extra):
    return run(root, "crew-ship", ["scout", "s-1", "--title", "Login 500", "--fleet", "app", *extra])


def ship(root, name="abc-1"):
    with open(f"{root}/{name}/ship.json") as f:
        return json.load(f)


class CrewShip(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.root = self.dir.name

    def tearDown(self):
        self.dir.cleanup()

    def test_bad_input_is_refused_and_nothing_is_written(self):
        base = ["--title", "t", "--fleet", "f", *MR]
        for args in (
            ["create", "a/b", *base],
            ["create", "abc-1", "--title", " ", "--fleet", "f", *MR],
            ["create", "abc-1", "--title", "t", "--fleet", "f", *[v.replace("gitlab.com/g/app", "https://x.com/a") for v in MR]],
            ["create", "abc-1", "--title", "t", "--fleet", "f", *[v.replace("/w/app", "w/app") for v in MR]],
            ["create", "abc-1", *base, "--task", "nope"],
        ):
            self.assertNotEqual(run(self.root, "crew-ship", args).returncode, 0, args)
        self.assertEqual(os.listdir(self.root), [])

    def test_valid_ship_file_add_mr_and_url(self):
        self.assertEqual(create(self.root).returncode, 0)
        data = ship(self.root)
        self.assertEqual((data["version"], data["ship"], data["task"], data["session"]["id"]), (1, "abc-1", None, "first"))
        self.assertEqual(data["mrs"][0]["url"], None)
        self.assertNotEqual(create(self.root).returncode, 0)
        self.assertEqual(run(self.root, "crew-ship", ["add-mr", "abc-1", *MR]).returncode, 0)
        self.assertEqual([m["n"] for m in ship(self.root)["mrs"]], [1, 2])
        for n, url in (("2", "nope"), ("3", "https://x.com/mr/3")):
            self.assertNotEqual(run(self.root, "crew-ship", ["url", "abc-1", n, url]).returncode, 0)
        self.assertEqual(run(self.root, "crew-ship", ["url", "abc-1", "2", "https://x.com/mr/2"]).returncode, 0)
        self.assertEqual(ship(self.root)["mrs"][1]["url"], "https://x.com/mr/2")

    def test_status_refreshes_session_but_not_in_a_sub_agent(self):
        create(self.root)
        status = lambda **env: run(self.root, "crew-status", ["--run", f"{self.root}/abc-1-mr1", "red", "running", "--order", "1"], **env)
        self.assertEqual(status(CLAUDE_CODE_SESSION_ID="second").returncode, 0)
        self.assertEqual(ship(self.root)["session"]["id"], "second")
        status(CLAUDE_CODE_SESSION_ID="child", CLAUDE_CODE_CHILD_SESSION="1")
        self.assertEqual(ship(self.root)["session"]["id"], "second")

    def test_status_without_a_ship_file_writes_only_the_status_file(self):
        self.assertEqual(run(self.root, "crew-status", ["--run", f"{self.root}/xyz-mr1", "red", "running", "--order", "1"]).returncode, 0)
        self.assertEqual(os.listdir(self.root), ["xyz-mr1"])

    def test_scout_writes_a_ship_file_with_no_mrs(self):
        r = scout(self.root)
        self.assertEqual(r.returncode, 0, r.stderr)
        data = ship(self.root, "s-1")
        self.assertEqual(data["version"], 1)
        self.assertEqual(data["ship"], "s-1")
        self.assertEqual(data["title"], "Login 500")
        self.assertEqual(data["fleet"], "app")
        self.assertEqual(data["task"], None)
        self.assertEqual(data["kind"], "scout")
        self.assertEqual(data["outcome"], None)
        self.assertEqual(data["mrs"], [])
        self.assertEqual(data["session"]["id"], "first")
        self.assertTrue(re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", data["created"]))

    def test_scout_refuses_bad_input_and_writes_nothing(self):
        for args in (
            ["scout", "a/b", "--title", "t", "--fleet", "f"],
            ["scout", "s-1", "--title", " ", "--fleet", "f"],
            ["scout", "s-1", "--title", "t", "--fleet", " "],
            ["scout", "s-1", "--title", "t", "--fleet", "f", "--task", "nope"],
        ):
            self.assertNotEqual(run(self.root, "crew-ship", args).returncode, 0, args)
        self.assertEqual(os.listdir(self.root), [])
        self.assertEqual(scout(self.root).returncode, 0)
        self.assertNotEqual(scout(self.root).returncode, 0)
        self.assertEqual(ship(self.root, "s-1")["mrs"], [])

    def test_scout_takes_no_mr_options(self):
        for pair in (["--repo", "/r/app"], ["--remote", "gitlab.com/g/app"], ["--worktree", "/w/app"], ["--branch", "b"]):
            self.assertNotEqual(scout(self.root, *pair).returncode, 0, pair)
        self.assertEqual(os.listdir(self.root), [])
        self.assertEqual(scout(self.root).returncode, 0)

    def test_create_writes_kind_ship_and_no_outcome(self):
        self.assertEqual(create(self.root).returncode, 0)
        data = ship(self.root)
        self.assertEqual(data["kind"], "ship")
        self.assertEqual(data["outcome"], None)

    def test_outcome_refuses_a_ship_that_is_not_a_scout(self):
        self.assertEqual(create(self.root).returncode, 0)
        self.assertNotEqual(run(self.root, "crew-ship", ["outcome", "abc-1", "not a bug"]).returncode, 0)
        self.assertEqual(ship(self.root)["outcome"], None)

    def test_add_mr_on_a_scout_makes_mr_one_and_clears_the_outcome(self):
        self.assertEqual(scout(self.root).returncode, 0)
        self.assertEqual(run(self.root, "crew-ship", ["outcome", "s-1", "not a bug"]).returncode, 0)
        self.assertEqual(run(self.root, "crew-ship", ["add-mr", "s-1", *MR]).returncode, 0)
        data = ship(self.root, "s-1")
        self.assertEqual([m["n"] for m in data["mrs"]], [1])
        self.assertEqual(data["mrs"][0]["branch"], "feat/x")
        self.assertEqual(data["kind"], "scout")
        self.assertEqual(data["outcome"], None)

    def test_outcome_sets_the_line_and_refuses_an_empty_one(self):
        self.assertNotEqual(run(self.root, "crew-ship", ["outcome", "s-1", "gone"]).returncode, 0)
        self.assertEqual(os.listdir(self.root), [])
        self.assertEqual(scout(self.root).returncode, 0)
        self.assertEqual(run(self.root, "crew-ship", ["outcome", "s-1", "not a bug: config issue on acc"]).returncode, 0)
        self.assertEqual(ship(self.root, "s-1")["outcome"], "not a bug: config issue on acc")
        for line in ("", "   "):
            self.assertNotEqual(run(self.root, "crew-ship", ["outcome", "s-1", line]).returncode, 0, repr(line))
        self.assertEqual(ship(self.root, "s-1")["outcome"], "not a bug: config issue on acc")

    def test_every_ship_write_refreshes_the_session_but_not_in_a_sub_agent(self):
        def sid(args, **env):
            self.assertEqual(run(self.root, "crew-ship", args, **env).returncode, 0, args)
            return ship(self.root, "s-1")["session"]["id"]

        self.assertEqual(sid(["scout", "s-1", "--title", "t", "--fleet", "f"], CLAUDE_CODE_SESSION_ID="a"), "a")
        self.assertEqual(sid(["outcome", "s-1", "nothing to fix"], CLAUDE_CODE_SESSION_ID="b"), "b")
        self.assertEqual(sid(["add-mr", "s-1", *MR], CLAUDE_CODE_SESSION_ID="c"), "c")
        self.assertEqual(sid(["url", "s-1", "1", "https://x.com/mr/1"], CLAUDE_CODE_SESSION_ID="d"), "d")
        self.assertEqual(sid(["add-mr", "s-1", *MR], CLAUDE_CODE_SESSION_ID="e", CLAUDE_CODE_CHILD_SESSION="1"), "d")
        self.assertEqual(create(self.root).returncode, 0)
        self.assertEqual(ship(self.root)["session"]["id"], "first")

    def test_create_and_scout_write_the_session_also_in_a_sub_agent(self):
        env = {"CLAUDE_CODE_SESSION_ID": "child", "CLAUDE_CODE_CHILD_SESSION": "1"}
        self.assertEqual(run(self.root, "crew-ship", ["create", "abc-1", "--title", "t", "--fleet", "f", *MR], **env).returncode, 0)
        self.assertEqual(ship(self.root)["session"]["id"], "child")
        self.assertEqual(run(self.root, "crew-ship", ["scout", "s-1", "--title", "t", "--fleet", "f"], **env).returncode, 0)
        self.assertEqual(ship(self.root, "s-1")["session"]["id"], "child")

    def test_an_old_file_with_no_kind_still_works(self):
        self.assertEqual(create(self.root).returncode, 0)
        path = f"{self.root}/abc-1/ship.json"
        with open(path) as f:
            data = json.load(f)
        data.pop("kind", None)
        data.pop("outcome", None)
        with open(path, "w") as f:
            json.dump(data, f)
        first = data["mrs"][0]
        r = run(self.root, "crew-ship", ["add-mr", "abc-1", *MR])
        self.assertEqual(r.returncode, 0, r.stderr)
        after = ship(self.root)
        self.assertEqual(after["kind"], "ship")
        self.assertEqual([m["n"] for m in after["mrs"]], [1, 2])
        self.assertEqual(after["mrs"][0], first)
        r = run(self.root, "crew-ship", ["url", "abc-1", "2", "https://x.com/mr/2"])
        self.assertEqual(r.returncode, 0, r.stderr)


if __name__ == "__main__":
    unittest.main()
