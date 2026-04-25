import type { Provider } from "@/lib/providers/types";

const now = Date.now();

type BeszelStatus = {
  configured: boolean;
  cpu: number;
  ram: number;
  disk: number;
  networkIn: number;
  networkOut: number;
  uptime: string;
  history: { time: string; cpu: number; ram: number; disk: number; network: number }[];
};

type SpeedtestStatus = {
  configured: boolean;
  latest: { download: number; upload: number; ping: number; jitter: number; isp: string; at: string };
  history: { time: string; download: number; upload: number; ping: number }[];
  averages: { download: number; upload: number; ping: number };
  best: number;
  worst: number;
};

type MediaPipelineStatus = {
  configured: boolean;
  apps: { name: string; status: "online" | "warning" | "offline"; detail: string }[];
  pipeline: { stage: string; count: number; status: "good" | "warning" | "danger" }[];
  queue: { title: string; app: string; state: string; eta: string }[];
};

export const beszelProvider: Provider<BeszelStatus> = {
  key: "beszel",
  name: "Beszel",
  async healthCheck() {
    const configured = Boolean(process.env.BESZEL_API_URL && process.env.BESZEL_API_KEY);
    return {
      configured,
      ok: true,
      message: configured ? "Beszel API configured" : "Using placeholder server metrics"
    };
  },
  async fetchCurrentStatus() {
    return {
      configured: Boolean(process.env.BESZEL_API_URL && process.env.BESZEL_API_KEY),
      cpu: 34,
      ram: 62,
      disk: 71,
      networkIn: 18.4,
      networkOut: 5.7,
      uptime: "18d 6h",
      history: Array.from({ length: 24 }, (_, index) => ({
        time: `${23 - index}h`,
        cpu: 20 + Math.round(Math.sin(index / 2) * 10 + index * 0.8),
        ram: 54 + Math.round(Math.cos(index / 3) * 8),
        disk: 71,
        network: 10 + Math.round(Math.sin(index) * 6 + 8)
      })).reverse()
    };
  },
  async fetchHistory() {
    return [];
  },
  normalizeData(input) {
    return input as BeszelStatus;
  }
};

export const speedtestProvider: Provider<SpeedtestStatus> = {
  key: "speedtest",
  name: "Speedtest Tracker",
  async healthCheck() {
    const configured = Boolean(process.env.SPEEDTEST_TRACKER_API_URL && process.env.SPEEDTEST_TRACKER_API_KEY);
    return {
      configured,
      ok: true,
      message: configured ? "Speedtest Tracker configured" : "Using placeholder speed data"
    };
  },
  async fetchCurrentStatus() {
    const history = Array.from({ length: 14 }, (_, index) => ({
      time: new Date(now - (13 - index) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      download: 610 + Math.round(Math.sin(index / 1.8) * 55),
      upload: 38 + Math.round(Math.cos(index / 2) * 5),
      ping: 11 + Math.round(Math.sin(index / 3) * 3)
    }));
    return {
      configured: Boolean(process.env.SPEEDTEST_TRACKER_API_URL && process.env.SPEEDTEST_TRACKER_API_KEY),
      latest: { download: 642, upload: 42, ping: 11, jitter: 1.6, isp: "Placeholder ISP", at: "12 minutes ago" },
      history,
      averages: {
        download: Math.round(history.reduce((sum, item) => sum + item.download, 0) / history.length),
        upload: Math.round(history.reduce((sum, item) => sum + item.upload, 0) / history.length),
        ping: Math.round(history.reduce((sum, item) => sum + item.ping, 0) / history.length)
      },
      best: Math.max(...history.map((item) => item.download)),
      worst: Math.min(...history.map((item) => item.download))
    };
  },
  async fetchHistory() {
    return [];
  },
  normalizeData(input) {
    return input as SpeedtestStatus;
  }
};

export const mediaPipelineProvider: Provider<MediaPipelineStatus> = {
  key: "tracearr",
  name: "Tracearr and media apps",
  async healthCheck() {
    const configured = Boolean(process.env.TRACEARR_API_URL || process.env.RADARR_API_URL || process.env.SONARR_API_URL);
    return {
      configured,
      ok: true,
      message: configured ? "Media integrations configured" : "Using placeholder media pipeline data"
    };
  },
  async fetchCurrentStatus() {
    return {
      configured: Boolean(process.env.TRACEARR_API_URL || process.env.RADARR_API_URL || process.env.SONARR_API_URL),
      apps: [
        { name: "Overseerr/Jellyseerr", status: "online", detail: "4 open requests" },
        { name: "Radarr", status: "online", detail: "2 queued movies" },
        { name: "Radarr-4K", status: "online", detail: "No blockers" },
        { name: "Sonarr", status: "warning", detail: "1 failed import" },
        { name: "Prowlarr", status: "online", detail: "12 indexers healthy" },
        { name: "SABnzbd", status: "online", detail: "24 MB/s" },
        { name: "Transmission", status: "online", detail: "3 active torrents" },
        { name: "Plex", status: "online", detail: "2 active streams" }
      ],
      pipeline: [
        { stage: "Requests", count: 4, status: "good" },
        { stage: "Search", count: 0, status: "good" },
        { stage: "Grab", count: 2, status: "good" },
        { stage: "Download", count: 5, status: "good" },
        { stage: "Import", count: 1, status: "warning" },
        { stage: "Failed import", count: 1, status: "danger" },
        { stage: "Stuck downloads", count: 0, status: "good" },
        { stage: "Missing items", count: 7, status: "warning" }
      ],
      queue: [
        { title: "Movie request", app: "Radarr", state: "Downloading", eta: "18m" },
        { title: "Series upgrade", app: "Sonarr", state: "Import warning", eta: "Needs review" },
        { title: "4K remux", app: "Radarr-4K", state: "Queued", eta: "1h 12m" }
      ]
    };
  },
  async fetchHistory() {
    return [];
  },
  normalizeData(input) {
    return input as MediaPipelineStatus;
  }
};
