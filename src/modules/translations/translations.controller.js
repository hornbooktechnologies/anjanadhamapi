const { successResponse } = require("../../utils/response");
const service = require("./translations.service");

const autoFill = async (req, res) => {
  const result = await service.autoFillTranslations(req.body.fields, req.body.targetLanguages);
  return successResponse(res, "Translations generated", result);
};

const getForEntity = async (req, res) => {
  const data = await service.getEntityTranslations(req.params.entityType, req.params.entityId);
  return successResponse(res, "Translations fetched", data);
};

const saveForEntity = async (req, res) => {
  await service.saveEntityTranslations(req.params.entityType, req.params.entityId, req.body.translations);
  const data = await service.getEntityTranslations(req.params.entityType, req.params.entityId);
  return successResponse(res, "Translations saved", data);
};

module.exports = {
  autoFill,
  getForEntity,
  saveForEntity,
};
