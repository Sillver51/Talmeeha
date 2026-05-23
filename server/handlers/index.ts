// Barrel for the per-domain socket handler registrars. The top-level aggregator
// lives in ../socket.ts (registerHandlers); these are its building blocks.
export { registerHostHandlers } from "./host";
export { registerOnlineHandlers } from "./online";
export { registerTeamHandlers } from "./teams";
export { registerPlayHandlers } from "./play";
export { registerLifecycleHandlers } from "./lifecycle";
