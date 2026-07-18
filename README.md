# lodhayush.github.io

Personal academic website of **Ayush Lodh** — Master's student in Computer Science & Engineering at NIT Delhi, advised by Dr. Nisha Singh Chauhan.

🔗 **Live:** https://lodhayush.github.io

## About

My research interests are computer vision, deep learning, and pattern recognition, with a focus on handwriting recognition and document understanding. This site collects my publications, research projects, and CV.

## Built with

[Jekyll](https://jekyllrb.com/) + the [al-folio](https://github.com/alshedivat/al-folio) theme, deployed automatically to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.

See **[PERSONALIZE.md](PERSONALIZE.md)** for the remaining to-dos and deployment steps.

### Local development (optional)

With Docker installed:

```bash
docker compose pull && docker compose up
# open http://localhost:8080
```

Before committing, format with Prettier:

```bash
npx prettier . --write
```

## License

The underlying [al-folio](https://github.com/alshedivat/al-folio) theme is released under the [MIT License](LICENSE). Site content (text, figures, publications) © Ayush Lodh.
