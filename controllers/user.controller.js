exports.profile = async (req, res) => {
  return res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role || "user"
  });
};
