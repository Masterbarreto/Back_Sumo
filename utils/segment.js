import { Analytics } from "@segment/analytics-node";
import "dotenv/config";

const segmentAnalytics = new Analytics({ writeKey: process.env.SEGMENT_WRITE_KEY });

export default segmentAnalytics;