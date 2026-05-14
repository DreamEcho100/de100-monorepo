// @refresh reload
import { mount, StartClient } from "@solidjs/start/client";

const appElem = document.getElementById("app");
if (!appElem) {
	throw new Error("app element not found");
}

mount(() => <StartClient />, appElem);
