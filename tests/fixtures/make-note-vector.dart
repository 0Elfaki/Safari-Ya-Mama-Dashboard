// Makes a Doctor's Note test vector with the app's real encryption (lib/core/note_share.dart).
import 'dart:convert';
import 'package:safari_ya_mama/core/note_share.dart';

Future<void> main() async {
  final note = {
    'v': 1, 'lang': 'en', 'name': 'Test Mother', 'made_at': '2026-11-05T09:00:00Z',
    'sections': [
      {'letter': 'S', 'title': 'Situation', 'rows': ['Pregnant 32 weeks', 'Headache since yesterday']},
      {'letter': 'B', 'title': 'Background', 'rows': ['G2 P1']},
      {'letter': 'A', 'title': 'Assessment', 'rows': ['BP 142/92 at home']},
      {'letter': 'R', 'title': 'Request', 'rows': ['Please re-check BP today']},
    ],
    'footer': 'Made with Safari ya Mama. Not a diagnosis.',
  };
  final sealed = await sealNote(note);
  final opened = await openNote(sealed.ciphertext, sealed.key);
  print(jsonEncode({'ciphertext': sealed.ciphertext, 'key': sealed.key, 'note': note, 'roundtrip_ok': jsonEncode(opened) == jsonEncode(note),
    'qr': shareQrPayload('3f2a9c1e-7b4d-4e8a-9f0c-1d2e3f4a5b6c', sealed.key)}));
}
