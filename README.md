# event-driven-architecture

### Steps to Run

#### Require Node.js V14+

```
create .env file on root of the folder with environment variable keys from .env.sample file
npm install

Start Development
npm run watch

Start Production
npm run start

```

## Folder Structure 
- database/redis/model: Contains the Schema for the DB Structure
- routes/v1.js: Has the different routes set up and the various functions which are triggered when navigated to a route
- controllers: Comtains the main function and logic of the system
- core: Contains logging, state machine and event transitions
- services/repository: Contains caching, event functions


