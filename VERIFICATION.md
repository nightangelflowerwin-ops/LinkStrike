# Verification

Checked locally on October 8, 2026.

All five automated server tests passed:

- Map collision and wall occlusion.
- Two humans share one room; another room stays isolated; disconnect removes a player.
- Client teleport fields are ignored, movement speed is capped, bursts respect fire cooldown, and reload ammunition is server-controlled.
- Practice bots are opt-in and labeled.
- Three aimed body shots eliminate another human, award a kill, increment a death, and trigger respawn.

Browser checks passed in Chrome using software graphics:

- Landing page rendered and room creation navigated to a unique invite URL.
- Clicking Enter Arena captured the mouse.
- Movement controls, firing, reloading, and opening the scoreboard were exercised.
- Firing consumed ammunition; reloading changed the display from 29 / 120 to 30 / 119.
- A second browser page joined through the same invitation; the UI displayed 2 ONLINE with Alpha and Bravo on the scoreboard.
- No browser runtime or resource errors were recorded in the final pass.
- Lobby, gameplay, and scoreboard screenshots were inspected or retained beside the project.

Limits: no remote device, public host, X interactive embed, mobile gameplay, high latency, load, or production security verification. Server tests establish prototype behavior, not production readiness.

Follow-up fixes: transport-level heartbeat keeps quiet tabs connected; stale movement stops automatically; bots wait for arena entry, navigate around cover, and have reduced accuracy. Scenery is rendered in batches. The in-app browser rejected mouse capture during inspection; drag aiming now lets the player enter anyway. Quick clicks fire immediately, and the HUD no longer intercepts canvas clicks. Verified a canvas click changed ammunition from 30 to 29 in the in-app browser. All six server tests passed, including quiet-connection and bot activation checks.


## October 8 polish pass
- Camera corrections decay smoothly instead of snapping every server snapshot; remote players interpolate between buffered snapshots with shortest-path yaw rotation. This is visual smoothing, not input replay or lag compensation.
- Jump prediction, weapon-only recoil (crosshair now matches firing aim), reload animation, crosshair kick, animated bot legs, procedural sand/plaster textures.
- Shared foliage material reduces scenery batches; unchanged HUD and score rows no longer rebuild each snapshot.
- In-app practice: entry, shot reducing ammo 30 to 29, reload status, pause and respawn observed. No browser warnings/errors captured.
- One measured practice sample: median frame 16.70 ms, p95 33.40 ms, 32 draw calls, 1836 triangles. Not a before/after benchmark or Brave result.
- All six server/game tests passed. Public hosting and X embedding remain unfinished.


## X embed preparation
- Seven automated tests passed, including HTTPS card URL generation, /play route, preview image and X frame-ancestors header.
- Browser tested inside a 480px iframe sandbox without allow-forms or allow-pointer-lock: Join, Enter Arena and shot (ammo 30 to 29) verified. Join uses an explicit click handler to avoid blocked form submission.
- No public hosting, tunnel, domain purchase or X post was created. Actual X display and mobile gameplay remain unverified.
- User budget constraint recorded in README: no paid hosting, domain or subscription.
