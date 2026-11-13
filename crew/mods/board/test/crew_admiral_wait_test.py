import json
import os
import subprocess
import tempfile
import unittest

BIN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bin", "crew-admiral-wait")


def write(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f)


class AdmiralWaitTest(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp()
        write(f"{self.root}/a/ship.json", {"ship": "a", "convoy": "c1"})
        write(f"{self.root}/b/ship.json", {"ship": "b", "convoy": "c1"})
        write(f"{self.root}/x/ship.json", {"ship": "x", "convoy": "other"})

    def member(self, run, role, state, updated="2026-11-13T10:00:00Z"):
        write(f"{self.root}/{run}/{role}.json", {"role": role, "state": state, "summary": f"{role} {state}", "updated": updated})

    def wait(self, *extra):
        out = subprocess.run([BIN, "c1", "--root", self.root, "--interval", "0.05", "--timeout", "0.3", *extra], capture_output=True, text=True)
        return out.returncode, json.loads(out.stdout)

    def test_a_blocked_gate_is_reported_once(self):
        self.member("a-mr1", "gate-spec", "blocked")
        self.member("b-mr1", "red", "running")
        code, out = self.wait()
        self.assertEqual(code, 0)
        self.assertEqual([(e["ship"], e["role"], e["state"]) for e in out["events"]], [("a", "gate-spec", "blocked")])
        code, out = self.wait()
        self.assertEqual(out, {"timeout": True, "open": 2})

    def test_the_same_gate_blocked_again_later_is_new(self):
        self.member("a-mr1", "gate-tests", "blocked")
        self.wait()
        self.member("a-mr1", "gate-tests", "blocked", updated="2026-11-13T11:00:00Z")
        self.assertEqual(len(self.wait()[1]["events"]), 1)

    def test_a_failed_member_is_reported_and_other_convoys_are_ignored(self):
        self.member("x-mr1", "green", "failed")
        self.member("b-mr2", "green", "failed")
        events = self.wait()[1]["events"]
        self.assertEqual([(e["run"], e["state"]) for e in events], [("b-mr2", "failed")])

    def test_done_when_every_run_is_done(self):
        self.member("a-mr1", "ship", "done")
        self.member("b-mr1", "ship", "done")
        self.assertEqual(self.wait()[1], {"done": True, "ships": ["a", "b"]})

    def test_an_unknown_convoy_is_an_error(self):
        out = subprocess.run([BIN, "nope", "--root", self.root, "--timeout", "0"], capture_output=True, text=True)
        self.assertEqual(out.returncode, 2)


if __name__ == "__main__":
    unittest.main()
