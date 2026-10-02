# Security

SifwakuLab is a static educational website published with GitHub Pages.

## Security principles

- No passwords, API keys, tokens, NRC numbers, student numbers or other secrets belong in this repository.
- The site does not process payments, passwords or other sensitive transactions.
- External resources should use HTTPS.
- External links opened in a new tab should use `rel="noopener noreferrer"`.
- Free resources should point to legitimate publishers or repositories rather than pirated copies.
- Changes are deployed through GitHub Actions with the minimum permissions needed for Pages deployment.

## Reporting a problem

If you find a security issue, do not publish credentials or exploit details in a public issue. Contact the repository owner privately through the GitHub profile and provide the affected page, a description of the issue and safe reproduction steps.

## GitHub Pages limitation

GitHub Pages provides HTTPS, but it is a static hosting service. It should not be used to collect passwords, payment-card data or other sensitive information.