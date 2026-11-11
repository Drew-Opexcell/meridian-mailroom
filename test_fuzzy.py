# Tests for the name matcher. Run with: python -m unittest

import unittest

from fuzzy import damerau_levenshtein, match_client, name_similarity, normalize_name


class TestDamerauLevenshtein(unittest.TestCase):
    def test_identical_is_zero(self):
        self.assertEqual(damerau_levenshtein("robert", "robert"), 0)

    def test_substitution_counts_one(self):
        self.assertEqual(damerau_levenshtein("robert", "rXbert"), 1)

    def test_swap_counts_one(self):
        # plain Levenshtein would call this 2; Damerau-Levenshtein says 1
        self.assertEqual(damerau_levenshtein("robert", "rboert"), 1)

    def test_insert_and_delete(self):
        self.assertEqual(damerau_levenshtein("castillo", "castiilo"), 1)
        self.assertEqual(damerau_levenshtein("okonkwo", "okonkw"), 1)


class TestNormalizeName(unittest.TestCase):
    def test_strips_suffixes_and_punctuation(self):
        self.assertEqual(normalize_name("Marcus Lee, Jr."), "marcus lee")
        self.assertEqual(normalize_name("O'Brien"), "obrien")
        self.assertEqual(normalize_name("Okonkwo-Hale"), "okonkwo hale")


class TestNameSimilarity(unittest.TestCase):
    def test_exact_after_cleaning(self):
        self.assertAlmostEqual(name_similarity("Marcus Lee Jr.", "Marcus Lee"), 1, places=5)

    def test_survives_one_ocr_error(self):
        self.assertGreater(name_similarity("Robert Castiilo", "Robert Castillo"), 0.9)


CLIENTS = [
    {"id": "c1", "matter_id": "M-1001", "first_name": "Robert", "last_name": "Castillo", "dob": "1974-03-12"},
    {"id": "c2", "matter_id": "M-1002", "first_name": "Maria", "last_name": "Gonzales", "dob": "1988-07-02"},
    {"id": "c3", "matter_id": "M-1003", "first_name": "Maria", "last_name": "Gonzalez", "dob": "1991-11-25"},
]


def letter_fields(name, dob=None):
    return {"claimant_name": name, "dob": dob, "ssn_last4": None, "doc_date": None}


class TestMatchClient(unittest.TestCase):
    def test_matches_through_ocr_noise(self):
        r = match_client(letter_fields("R0bert Castiilo"), CLIENTS)
        self.assertTrue(r["matched"])
        self.assertEqual(r["client_id"], "c1")
        self.assertEqual(r["method"], "fuzzy")

    def test_dob_breaks_a_near_tie(self):
        r = match_client(letter_fields("Maria Gonzalez", dob="1988-07-02"), CLIENTS)
        self.assertTrue(r["matched"])
        self.assertEqual(r["client_id"], "c2")  # the DOB points at Gonzales, not the closer-spelled Gonzalez
        self.assertEqual(r["method"], "fuzzy+dob")

    def test_stranger_gets_no_match(self):
        r = match_client(letter_fields("Zachary Ellsworth"), CLIENTS)
        self.assertFalse(r["matched"])
        self.assertEqual(r["method"], "none")

    def test_no_name_gets_no_match(self):
        r = match_client(letter_fields(None), CLIENTS)
        self.assertFalse(r["matched"])


if __name__ == "__main__":
    unittest.main()
