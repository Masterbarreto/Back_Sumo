import express from "express";
import {
  getCertificates,
  issueCertificates,
  getCertificateStats,
} from "../controllers/Certificates/CertificateController.js";

const router = express.Router();

router.get("/", getCertificates);
router.post("/", issueCertificates);
router.get("/stats", getCertificateStats);

export default router;
