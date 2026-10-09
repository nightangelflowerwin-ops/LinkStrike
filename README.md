# LinkStrike

An original browser arena shooter with one invite link per match. Inspired by the short, competitive shooting loop and the Tweetcraft sharing flow. It is not Counter-Strike 2 and does not use its maps, logos, sounds, or assets.

## Run

Requires Node.js 22 or later.

```
npm install
npm start
```

Open http://localhost:4173. Create an arena, enter a callsign, then copy the invite. Guests on the same computer can open the link in another browser. For another device on the same network, use the host computer's network address instead of localhost. Windows Firewall may require a user-approved inbound rule.

Use WASD to move, mouse to aim, left click to shoot, R to reload, Space to jump, and hold Tab for the scoreboard. Escape pauses your controls. If the browser rejects mouse capture, hold the right mouse button and drag to aim, and left click to fire. Try Solo adds three clearly labeled practice bots. Matches end at 20 kills or five minutes.

## Public hosting

Deploy the whole Node application to a host supporting long-lived WebSocket connections, with HTTPS and WebSocket upgrades enabled. The service listens on the PORT environment variable, default 4173. This cannot be deployed as only static HTML. A public deployment has not been created. A link starting with localhost only works on the same computer.

Rooms and scores are held in memory. Rooms expire five minutes after the last human leaves and disappear on restart. One running server instance is required; multiple instances need a shared room coordinator. This prototype supports at most 12 humans per room and 100 rooms per process, but those limits are not load-tested.

## Implementation and limits

The server controls movement, collision, health, fire rate, ammunition, hits, respawning, and match scores. The client predicts movement and interpolates remote players. It uses Three.js for original geometry and WebSocket for a 20 Hz match update. Spawn protection lasts 1.8 seconds and ends when firing.

This first version has one map, one rifle, free-for-all matches, bots, and invite links. It has no teams, bomb objective, economy, accounts, persistent progression, lag compensation, production anti-cheat, mobile controls, or verified interactive X embed. Sharing a link in a tweet is supported by the room URL design; playable cards inside X need a separate implementation and platform verification.

Tests: npm test.


## X embed preparation and budget

The user has no hosting budget. Do not purchase hosting, a domain, or a subscription. This build remains local; no public endpoint has been created.

Room pages now serve Player Card metadata when PUBLIC_ORIGIN is configured with the actual public HTTPS origin. For example, set PUBLIC_ORIGIN=https://your-public-host before starting the server. No cards are advertised for localhost. The /play/<room-id> route has a compact layout, an open-full-game fallback and the existing drag aiming fallback. Frame-ancestors permits this origin and X/Twitter. The preview image is served locally. No twitter:site account is invented.

Open /embed-test to exercise a 480px sandboxed iframe without pointer lock. This is a development check, not confirmation of X compatibility. Phone controls are still unsupported.

A zero-cost public tunnel to the local server is a potential next deployment step. It would expose the game to the internet and requires explicit approval at activation. Your PC and server must stay running. Temporary URLs, in-memory rooms and X crawler caching make this unsuitable as permanent hosting. Real X card display and app behavior must be tested using the actual public URL.
