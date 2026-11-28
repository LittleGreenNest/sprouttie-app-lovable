# Swap reliability

Swap now offers a reviewed Mandarin/English word library immediately, alongside saved cards and optional AI suggestions. Parents can search, select, cancel or confirm without waiting for the model. Library words retain separate meanings and tone-marked pinyin in the existing compatible display format. These options do not claim to reflect a child's interests.

AI requests have an eight-second upstream deadline and a twelve-second UI waiting limit. Failures show a retry message while local choices remain available. Request loading state is scoped per word; failed responses are not cached as successful empty results. Mandarin AI responses require complete Chinese, pinyin and English fields. Pending, saved and spoken words are excluded from AI candidates.

Confirmation updates only the selected, owner-matched pending suggestion, clears its old rationale/tip and requires the updated ID to be returned. Zero-row updates fail visibly. Cancelling closes the picker without saving.

Validation: 35 Node regression tests pass; production build passes. Regression coverage includes new accounts without spare cards, search fields, exclusions, owner/status-scoped writes, zero-row failures, structured AI results and upstream timeout handling. Live iPhone selection/Cancel/refresh persistence still requires retesting after deployment.
