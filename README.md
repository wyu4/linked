# Linked

<img src="./public/banner.png/" >

A web-app that finds the shortest path between two users on GitHub. This is based on the _Six Degrees of Seperation_ theory.

**Live demo: [linked.wyu.app](https://linked.wyu.app)**

## 💡 Idea

The _Six Degress of Seperation_ theory says that any two people in the world can be connected to each other using at most six social connections.

This app uses Bi-Directional Breadth-First Search to comb through two users' public followings/followers to find social connections at a maximum depth of 10.

## 📦 Installation

_Linked_ uses [React](https://react.dev/) + [NextJS](https://nextjs.org/), and is deployed on [Vercel](https://vercel.com/). The project is licensed, see [LICENSE.md](./LICENSE.md).

### Requirements

- [Git](https://git-scm.com/install/)
- [Node.js](https://nodejs.org/en/download)
- [Playwright](https://playwright.dev/docs/intro#installing-playwright) (Optional, see commands section)

### Instructions

Clone the repository to get the project onto your device.

```bash
git clone https://github.com/wyu4/linked.git
```

Then, install the project dependencies.

```bash
npm install
```

Create a copy of [.env.example](./.env.example), replacing `.example` with `.local`, and fill the information in the file.

```
GITHUB_CLIENT_ID=0 # Your OAUTH app ID
GITHUB_CLIENT_SECRET=0 # Your OAUTH secret
BETTER_AUTH_SECRET=0 # Generate a secret using 'npm run generate'
BETTER_AUTH_URL=http://localhost:3000 # Change this to your base URL
NEXT_PUBLIC_MAX_DEPTH=5 # Change this to the max lookup depth for one direction of BFS
```

To run the project, run the development command.

```bash
npm run dev
```

### Commands

| Command               | Description                                                    |
| --------------------- | -------------------------------------------------------------- |
| `npm run dev`         | Builds and runs the project locally with a live-updating build |
| `npm run build`       | Builds and runs an optimized production build locally          |
| `npm run lint`        | Runs linting checks                                            |
| `npm run refresh`     | Clears `.next` cache and reloads dependencies                  |
| `npm run dev:refresh` | Runs the refresh command and then the development command      |
| `npm run generate`    | Generates a valid `BETTERAUTH` encryption secret.              |
| `npm run clear`       | Clears only the `.next` cache folder                           |
| `npm run dev:clear`   | Runs the clear command and then the development command        |

This project also supports _Playwright_ commands for testing purposes. Install using the npx command line.

```bash
npx playwright install
```

To use any of the following commands, first host the project locally on port 3000 using `npm run dev` on a seperate terminal.

| Additional Test Commands | Description                                  |
| ------------------------ | -------------------------------------------- |
| `npm run test:chrome`    | Creates a chrome window and opens port 3000  |
| `npm run test:firefox`   | Creates a firefox window and opens port 3000 |
| `npm run test:safari`    | Creates a safari window and opens port 3000  |
