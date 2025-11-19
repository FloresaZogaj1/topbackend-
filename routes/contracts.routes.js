const router = require("express").Router();
const c = require("../controllers/contracts.controller");

router.post("/softsave", c.createSoftSave);
router.get("/softsave", c.listSoftSave);
router.get("/softsave/:id", c.getSoftSave);
router.put("/softsave/:id", c.updateSoftSave);
router.delete("/softsave/:id", c.deleteSoftSave);

module.exports = router;
