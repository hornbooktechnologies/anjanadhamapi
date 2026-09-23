const globalContentService = require("./global-content.service");
const { successResponse } = require("../../utils/response");

// ==========================================
// 1. SEO Controllers
// ==========================================
const getAllSeo = async (req, res) => {
  const data = await globalContentService.getAllSeoContent();
  return successResponse(res, "SEO content fetched successfully", data);
};

const getSeoPage = async (req, res) => {
  const data = await globalContentService.getSeoByPage(req.params.page);
  return successResponse(res, "SEO page content fetched successfully", data);
};

const getSeoById = async (req, res) => {
  const data = await globalContentService.getSeoById(req.params.id);
  return successResponse(res, "SEO content fetched successfully", data);
};

const saveSeo = async (req, res) => {
  const data = await globalContentService.createOrUpdateSeo(req.body);
  return successResponse(res, "SEO content saved successfully", data);
};

const updateSeo = async (req, res) => {
  const data = await globalContentService.updateSeoById(req.params.id, req.body);
  return successResponse(res, "SEO content updated successfully", data);
};

const deleteSeoContent = async (req, res) => {
  await globalContentService.deleteSeo(req.params.id);
  return successResponse(res, "SEO content deleted successfully");
};

// ==========================================
// 2. Footer Controllers
// ==========================================
const getFooter = async (req, res) => {
  const data = await globalContentService.getFooterDetails();
  return successResponse(res, "Footer details fetched successfully", data);
};

const updateFooter = async (req, res) => {
  await globalContentService.updateFooterDetails(req.body);
  const updated = await globalContentService.getFooterDetails();
  return successResponse(res, "Footer details updated successfully", updated);
};

// ==========================================
// 3. Certificates Controllers
// ==========================================
const getCertificates = async (req, res) => {
  const data = await globalContentService.getAllCertificates();
  return successResponse(res, "Certificates fetched successfully", data);
};

const getCertById = async (req, res) => {
  const data = await globalContentService.getCertificateById(req.params.id);
  return successResponse(res, "Certificate fetched successfully", data);
};

const createCert = async (req, res) => {
  const data = await globalContentService.createCertificate(req.body);
  return successResponse(res, "Certificate created successfully", data, 201);
};

const updateCert = async (req, res) => {
  const data = await globalContentService.updateCertificate(req.params.id, req.body);
  return successResponse(res, "Certificate updated successfully", data);
};

const deleteCert = async (req, res) => {
  await globalContentService.deleteCertificate(req.params.id);
  return successResponse(res, "Certificate deleted successfully");
};

// ==========================================
// 4. Inquiries Controllers
// ==========================================
const getInquiries = async (req, res) => {
  const { search, purpose, page, limit, pageUrl, startDate, endDate } = req.query;
  const data = await globalContentService.getAllInquiries({ search, purpose, page, limit, pageUrl, startDate, endDate });
  return successResponse(res, "Inquiries fetched successfully", data.inquiries, 200, data.pagination);
};

const createNewInquiry = async (req, res) => {
  const data = await globalContentService.createInquiry(req.body);
  return successResponse(res, "Inquiry submitted successfully", data, 201);
};

const deleteInquiryRecord = async (req, res) => {
  await globalContentService.deleteInquiry(req.params.id);
  return successResponse(res, "Inquiry record deleted successfully");
};

// ==========================================
// 5. FAQ Controllers
// ==========================================
const getFaqs = async (req, res) => {
  const data = await globalContentService.getAllFaqs();
  return successResponse(res, "FAQs fetched successfully", data);
};

const getFaqById = async (req, res) => {
  const data = await globalContentService.getFaqById(req.params.id);
  return successResponse(res, "FAQ fetched successfully", data);
};

const createNewFaq = async (req, res) => {
  const data = await globalContentService.createFaq(req.body);
  return successResponse(res, "FAQ created successfully", data, 201);
};

const updateFaqDetails = async (req, res) => {
  const data = await globalContentService.updateFaq(req.params.id, req.body);
  return successResponse(res, "FAQ updated successfully", data);
};

const deleteFaqRecord = async (req, res) => {
  await globalContentService.deleteFaq(req.params.id);
  return successResponse(res, "FAQ deleted successfully");
};

// ==========================================
// 6. Banner Controllers
// ==========================================
const getBanners = async (req, res) => {
  const data = await globalContentService.getAllBanners();
  return successResponse(res, "Banners fetched successfully", data);
};

const getBannerById = async (req, res) => {
  const data = await globalContentService.getBannerById(req.params.id);
  return successResponse(res, "Banner fetched successfully", data);
};

const updateBannerDetails = async (req, res) => {
  const data = await globalContentService.updateBanner(req.params.id, req.body);
  return successResponse(res, "Banner updated successfully", data);
};

module.exports = {
  getAllSeo,
  getSeoPage,
  getSeoById,
  saveSeo,
  updateSeo,
  deleteSeoContent,
  getFooter,
  updateFooter,
  getCertificates,
  getCertById,
  createCert,
  updateCert,
  deleteCert,
  getInquiries,
  createNewInquiry,
  deleteInquiryRecord,
  getFaqs,
  getFaqById,
  createNewFaq,
  updateFaqDetails,
  deleteFaqRecord,
  getBanners,
  getBannerById,
  updateBannerDetails,
};

