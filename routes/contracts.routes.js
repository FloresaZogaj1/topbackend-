const router = require("express").Router();
const c = require("../controllers/contracts.controller");

router.post("/softsave", c.createSoftSave);
router.get("/softsave", c.listSoftSave);
router.get("/softsave/:id", c.getSoftSave);

module.exports = router;
