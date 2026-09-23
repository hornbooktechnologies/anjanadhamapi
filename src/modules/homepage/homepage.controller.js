const homepageService = require("./homepage.service");
const { successResponse } = require("../../utils/response");

// Stats
const getStats = async (req, res) => {
  const data = await homepageService.getAllStats();
  return successResponse(res, "Stats fetched successfully", data);
};
const getStatById = async (req, res) => {
  const data = await homepageService.getStatById(req.params.id);
  return successResponse(res, "Stat fetched successfully", data);
};
const createStat = async (req, res) => {
  const data = await homepageService.createStat(req.body);
  return successResponse(res, "Stat created successfully", data, 201);
};
const updateStat = async (req, res) => {
  const data = await homepageService.updateStat(req.params.id, req.body);
  return successResponse(res, "Stat updated successfully", data);
};
const deleteStat = async (req, res) => {
  await homepageService.deleteStat(req.params.id);
  return successResponse(res, "Stat deleted successfully");
};

// Process Section
const getProcessSection = async (req, res) => {
  const data = await homepageService.getProcessSection();
  return successResponse(res, "Process section fetched successfully", data);
};
const updateProcessSection = async (req, res) => {
  await homepageService.updateProcessSection(req.body);
  const data = await homepageService.getProcessSection();
  return successResponse(res, "Process section updated successfully", data);
};
const getProcessSteps = async (req, res) => {
  const data = await homepageService.getAllProcessSteps();
  return successResponse(res, "Process steps fetched successfully", data);
};
const getProcessStepById = async (req, res) => {
  const data = await homepageService.getProcessStepById(req.params.id);
  return successResponse(res, "Process step fetched successfully", data);
};
const createProcessStep = async (req, res) => {
  const data = await homepageService.createProcessStep(req.body);
  return successResponse(res, "Process step created successfully", data, 201);
};
const updateProcessStep = async (req, res) => {
  const data = await homepageService.updateProcessStep(req.params.id, req.body);
  return successResponse(res, "Process step updated successfully", data);
};
const deleteProcessStep = async (req, res) => {
  await homepageService.deleteProcessStep(req.params.id);
  return successResponse(res, "Process step deleted successfully");
};

// Why Choose Section
const getWhyChooseSection = async (req, res) => {
  const data = await homepageService.getWhyChooseSection();
  return successResponse(res, "Why Choose section fetched successfully", data);
};
const updateWhyChooseSection = async (req, res) => {
  await homepageService.updateWhyChooseSection(req.body);
  const data = await homepageService.getWhyChooseSection();
  return successResponse(res, "Why Choose section updated successfully", data);
};
const getWhyChooseCards = async (req, res) => {
  const data = await homepageService.getAllWhyChooseCards();
  return successResponse(res, "Cards fetched successfully", data);
};
const getWhyChooseCardById = async (req, res) => {
  const data = await homepageService.getWhyChooseCardById(req.params.id);
  return successResponse(res, "Card fetched successfully", data);
};
const createWhyChooseCard = async (req, res) => {
  const data = await homepageService.createWhyChooseCard(req.body);
  return successResponse(res, "Card created successfully", data, 201);
};
const updateWhyChooseCard = async (req, res) => {
  const data = await homepageService.updateWhyChooseCard(req.params.id, req.body);
  return successResponse(res, "Card updated successfully", data);
};
const deleteWhyChooseCard = async (req, res) => {
  await homepageService.deleteWhyChooseCard(req.params.id);
  return successResponse(res, "Card deleted successfully");
};

// Homepage Banners
const getBanners = async (req, res) => {
  const data = await homepageService.getAllHomepageBanners(req.query);
  return successResponse(res, "Homepage banners fetched successfully", data);
};
const getBannerById = async (req, res) => {
  const data = await homepageService.getHomepageBannerById(req.params.id);
  return successResponse(res, "Homepage banner fetched successfully", data);
};
const createBanner = async (req, res) => {
  const data = await homepageService.createHomepageBanner(req.body);
  return successResponse(res, "Homepage banner created successfully", data, 201);
};
const updateBanner = async (req, res) => {
  const data = await homepageService.updateHomepageBanner(req.params.id, req.body);
  return successResponse(res, "Homepage banner updated successfully", data);
};
const deleteBanner = async (req, res) => {
  await homepageService.deleteHomepageBanner(req.params.id);
  return successResponse(res, "Homepage banner deleted successfully");
};
const toggleBannerStatus = async (req, res) => {
  const data = await homepageService.toggleHomepageBannerStatus(req.params.id);
  return successResponse(res, "Homepage banner status updated successfully", data);
};

module.exports = {
  getStats, getStatById, createStat, updateStat, deleteStat,
  getProcessSection, updateProcessSection,
  getProcessSteps, getProcessStepById, createProcessStep, updateProcessStep, deleteProcessStep,
  getWhyChooseSection, updateWhyChooseSection,
  getWhyChooseCards, getWhyChooseCardById, createWhyChooseCard, updateWhyChooseCard, deleteWhyChooseCard,
  getBanners, getBannerById, createBanner, updateBanner, deleteBanner, toggleBannerStatus,
};
