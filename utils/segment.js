import { Analytics } from "@segment/analytics-node";
import "dotenv/config";

let segmentAnalytics;
if (process.env.SEGMENT_WRITE_KEY) {
  segmentAnalytics = new Analytics({ writeKey: process.env.SEGMENT_WRITE_KEY });
} else {
  console.warn("SEGMENT_WRITE_KEY is missing. Segment tracking disabled. ⚠️");
  segmentAnalytics = {
    track: () => {}
  };
}

export default segmentAnalytics;