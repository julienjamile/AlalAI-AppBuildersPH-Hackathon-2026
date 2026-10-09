import os
import unittest
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException, UploadFile
from PIL import Image
from starlette.datastructures import Headers

from backend import main
from backend.tala import tala_parse_photo_text


def upload(filename: str, content_type: str, content: bytes) -> UploadFile:
    return UploadFile(
        filename=filename,
        file=BytesIO(content),
        headers=Headers({"content-type": content_type}),
    )


class IntakeTests(unittest.TestCase):
    def test_photo_parser_extracts_labeled_name_and_iso_birthdate(self) -> None:
        result = tala_parse_photo_text(
            "SURNAME: SANTOS\nGIVEN NAME: MARIA\nMIDDLE NAME: REYES\n"
            "ISSUED: 2020-05-10\nDATE OF BIRTH: 2001-04-21\nBRGY. SAN JOSE"
        )

        self.assertEqual(result["representative_name"], "Maria Reyes Santos")
        self.assertEqual(result["birthdate"], "2001-04-21")
        self.assertEqual(result["location"], "")

    def test_photo_parser_does_not_treat_id_heading_as_a_person(self) -> None:
        with self.assertRaises(HTTPException) as raised:
            main._parse_photo_text("REPUBLIC OF THE PHILIPPINES\nPHILIPPINE IDENTIFICATION CARD")

        self.assertEqual(raised.exception.status_code, 422)

    def test_photo_upload_uses_local_ocr_and_returns_reviewable_text(self) -> None:
        image_data = BytesIO()
        Image.new("RGB", (300, 180), "white").save(image_data, format="JPEG")

        def ocr(_image):
            return [
                (None, "NAME: JUAN DELA CRUZ", 0.98),
                (None, "DATE OF BIRTH: 1980-03-02", 0.96),
            ], 0.02

        with patch.object(main, "_get_ocr_engine", return_value=ocr):
            result = main.intake_photo_upload(upload("id.jpg", "image/jpeg", image_data.getvalue()))

        self.assertEqual(result.representative_name, "Juan Dela Cruz")
        self.assertEqual(result.birthdate, "1980-03-02")
        self.assertIn("NAME: JUAN DELA CRUZ", result.raw_transcript or "")
        self.assertGreater(result.confidence_scores["ocr_text"], 0.9)

    def test_voice_upload_transcribes_locally_and_removes_temporary_audio(self) -> None:
        temporary_paths = []

        class WhisperStub:
            def transcribe(self, path, **_kwargs):
                temporary_paths.append(path)
                return iter([SimpleNamespace(text="Juan dela Cruz, 42 taong gulang, lima kami; may baby")]), None

        with patch.object(main, "_get_whisper_model", return_value=WhisperStub()):
            result = main.intake_voice_upload(upload("interview.m4a", "audio/mp4", b"audio bytes"))

        self.assertEqual(result.representative_name, "Juan Dela Cruz")
        self.assertEqual(result.members_count, 5)
        self.assertTrue(result.has_infant)
        self.assertFalse(os.path.exists(temporary_paths[0]))

    def test_photo_upload_rejects_unreadable_images(self) -> None:
        with self.assertRaises(HTTPException) as raised:
            main.intake_photo_upload(upload("id.jpg", "image/jpeg", b"not an image"))

        self.assertEqual(raised.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
