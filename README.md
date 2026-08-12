# QA Architect — Suite de aseguramiento de calidad multi-lenguaje

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-777BB4?style=for-the-badge&logo=php&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-4A4A4A?style=for-the-badge&logo=ollama&logoColor=white)
![License](https://img.shields.io/badge/Licencia-MIT-green?style=for-the-badge)

> **QA impulsado por IA local: CLI de auditoría, SDKs en JS/PHP/Python y dashboard para validar épicas y matrices de prueba.**

QA Architect es un monorepo completo de **aseguramiento de calidad**: un **CLI** que audita código con un modelo local (Ollama), **SDKs de captura** en JavaScript, PHP y Python para instrumentar aplicaciones, y un **dashboard** en Vite para visualizar los resultados.

## ✨ Características

- **CLI de auditoría** — comandos para analizar repositorios y detectar riesgos de calidad
- **IA local con Ollama** — el análisis corre con modelos locales (7B), sin enviar código a la nube
- **SDKs multi-lenguaje** — captura de eventos y métricas desde JS, PHP y Python
  - `sdk-js`: interceptors de red y captura de eventos en el navegador
  - `sdk-php`: service layer con Dependency Injection y EventSubscriber
  - `sdk-python`: cliente de captura
- **Dashboard** — visualización de épicas, matrices de prueba y resultados en Vite
- **Configurable** — `qa-architect.config.example.json` para ajustar el comportamiento por proyecto

## 🛠 Stack

| Capa | Tecnología |
|---|---|
| CLI | TypeScript / Node.js |
| SDKs | JavaScript, PHP, Python |
| Dashboard | Vite + TypeScript |
| IA local | Ollama (modelos 7B) |
| Monorepo | pnpm workspaces |

## 🚀 Inicio rápido

```bash
pnpm install
pnpm build

# Registrar el CLI globalmente
cd packages/cli
npm link
qa-architect --version

# Configurar Ollama (modelo local)
ollama serve
```

Más detalles en [`IMPLEMENTATION.md`](IMPLEMENTATION.md).

## 📁 Estructura

```
qa-architect/
├── packages/
│   ├── cli/               # CLI de auditoría (TypeScript)
│   ├── sdk-js/            # SDK de captura para JavaScript
│   ├── sdk-php/           # SDK de captura para PHP
│   └── sdk-python/        # SDK de captura para Python
├── dashboard/             # Visualización web (Vite)
├── examples/              # Ejemplos de uso
├── qa-architect.config.example.json
└── IMPLEMENTATION.md      # Guía de instalación y uso
```

## 🧠 Detalles técnicos

- Los SDKs implementan la **misma interfaz de captura en tres lenguajes**, lo que permite instrumentar aplicaciones heterogéneas (web PHP, SPA, scripts Python) contra una sola plataforma de QA.
- El CLI usa **Ollama** para análisis local: el código nunca sale de la máquina del usuario.
- Monorepo gestionado con **pnpm workspaces**, con build en cascada para CLI y dashboard.

<!-- Agrega capturas en docs/screenshots/ -->

---

## Desarrollado por Francisco Javier Laguna

Full-stack developer · React · Vue · .NET · PHP

[GitHub](https://github.com/jlaguna553) · [LinkedIn](https://www.linkedin.com/in/francisco-javier-laguna-mondrag%C3%B3n-80a798154/) · [CV Online](https://cv-online.jlaguna553.workers.dev/v/xrdcnyej)
