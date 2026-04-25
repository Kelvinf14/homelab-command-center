import type { Provider } from "@/lib/providers/types";
import { dockerProvider } from "@/lib/providers/dockerProvider";
import { uptimeProvider } from "@/lib/providers/uptimeProvider";
import { beszelProvider, mediaPipelineProvider, speedtestProvider } from "@/lib/providers/integrationProvider";

function notConfiguredProvider(key: string, name: string): Provider<{ configured: false; message: string }> {
  return {
    key,
    name,
    async healthCheck() {
      return { configured: false, ok: true, status: "not_configured", message: `${name} is not configured` };
    },
    async fetchCurrentStatus() {
      return { configured: false, message: `${name} is not configured` };
    },
    async fetchHistory() {
      return [];
    },
    normalizeData(input) {
      return input as { configured: false; message: string };
    }
  };
}

export const providers = {
  dockerProvider,
  beszelProvider,
  uptimeProvider,
  speedtestProvider,
  tracearrProvider: mediaPipelineProvider,
  arrProvider: notConfiguredProvider("arr", "Arr apps"),
  sabnzbdProvider: notConfiguredProvider("sabnzbd", "SABnzbd"),
  transmissionProvider: notConfiguredProvider("transmission", "Transmission"),
  plexProvider: notConfiguredProvider("plex", "Plex")
};

export { dockerProvider, uptimeProvider, beszelProvider, speedtestProvider, mediaPipelineProvider };
