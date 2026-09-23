const service = require("./reorder.service");
const { successResponse } = require("../../utils/response");

async function reorderSequence(req, res) {
  const data = await service.reorderSequence({
    scope: req.body.scope,
    items: req.body.items,
    user: req.user,
  });

  return successResponse(res, "Sequence updated successfully", data);
}

module.exports = {
  reorderSequence,
};
