import json
import os
import subprocess
import tempfile
import unittest

BIN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bin", "crew-config")


class CrewConfigTest(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp()

    def linear(self, remote):
        out = subprocess.run([BIN, "--root", self.root, "linear", remote], capture_output=True, text=True)
        return out.returncode, out.stdout and json.loads(out.stdout)

    def test_no_config_means_no_rule(self):
        self.assertEqual(self.linear("gitlab.com/acme/app"), (0, {}))

    def test_the_longest_matching_remote_wins_and_empty_fields_are_dropped(self):
        rules = [
            {"remote": "gitlab.com/acme/", "required": True, "team": "ENG"},
            {"remote": "gitlab.com/acme/design/", "required": True, "team": ""},
            {"remote": "github.com/me/", "required": False},
        ]
        with open(f"{self.root}/config.json", "w") as f:
            json.dump({"linear": rules}, f)
        self.assertEqual(self.linear("https://GitLab.com/acme/app.git")[1], {"remote": "gitlab.com/acme/", "required": True, "team": "ENG"})
        self.assertEqual(self.linear("gitlab.com/acme/design/kit")[1], {"remote": "gitlab.com/acme/design/", "required": True})
        self.assertEqual(self.linear("gitlab.com/other/app")[1], {})

    def test_bad_json_is_an_error(self):
        with open(f"{self.root}/config.json", "w") as f:
            f.write("{")
        self.assertNotEqual(self.linear("x")[0], 0)


if __name__ == "__main__":
    unittest.main()
