---
source_url: https://developer-lostark.game.onstove.com/faq
fetched_at: 2026-05-15T22:30:00+09:00
total_questions: 13
---

# Lost Ark OpenAPI - FAQ

Official portal: https://developer-lostark.game.onstove.com/faq

---

## About Getting Started

### Q: What is the maintenance schedule?

A: When the official Lostark website undergoes maintenance, the Lostark Open API
website and all its endpoints will also be unavailable. During maintenance
windows, expect 503 Service Unavailable responses. Reduce request frequency upon
receiving this status.

---

### Q: My API call succeeded but returned a 401 error. Why?

A: Ensure your access token is set correctly. The required format is:
Authorization: bearer {your_JWT} Common mistakes:

- Missing the bearer prefix entirely
- Using invalid formats such as brackets or braces around the token
- Using uppercase BEARER instead of lowercase bearer

---

### Q: Can I create a client without an application URL?

A: Yes. A URL is not required for client creation.

---

### Q: How many clients can I create per account?

A: You can create up to 5 clients per account.

---

### Q: Do I need to agree to Terms of Use to create a client?

A: Yes. You must accept both the Terms of Use and Privacy Policy to create a
client.

---

### Q: Where do I find my JWT key?

A: Check the API KEY on the MY CLIENTS page, or click the identity button at the
top right of the portal to view your token in a popup.

---

### Q: Why does the API have throttling?

A: Throttling promotes fair usage, enhances service stability, and fosters
robust application design. All clients share the same rate limit pool, so
throttling ensures no single client degrades service for others.

---

### Q: The [Try it out] button does not send a request. Why?

A: The [Try it out] button only populates input fields and activates the Execute
button. To make the actual API request, you must fill in the parameters and then
click the Execute button.

---

## About Usage

### Q: How can I increase my API request limit?

A: Go to MY CLIENTS, select the desired client, click REQUEST FOR MONETIZATION &
LIMIT INCREASE, and complete the application form. Your request will be reviewed
by the development team.

---

### Q: Why is the in-game data not showing as real-time?

A: Data synchronization between the game and the API can take a few minutes.
Please allow for this delay. If data is still outdated after 30 minutes, contact
support at developer-lostark@smilegate.com.

---

### Q: How do I report an API bug?

A: Email developer-lostark@smilegate.com with a detailed description and
reproduction steps for the bug.

---

### Q: My API requests suddenly stopped working. What should I check?

A: Check the following in order:

1. JWT token validity (not expired)
2. Authorization header format (bearer prefix, no extra characters)
3. HTTP status codes in the response
4. API Status page for known outages
5. X-RateLimit-Remaining header value (throttling)

---

### Q: My application keeps hitting the maximum request limit. What should I do?

A: Monitor the X-RateLimit-Remaining response header. If you see a value of 0,
throttle your client application and wait until the quota resets (see
X-RateLimit-Reset header for the reset timestamp). Implement caching for static
data endpoints to reduce request frequency.

---

### Q: Do you support XML response format?

A: No. Only application/json is supported. Always set Accept: application/json
in your request headers.

---

## Contact

Email: developer-lostark@smilegate.com Use for: bug reports, feedback, limit
increase requests
