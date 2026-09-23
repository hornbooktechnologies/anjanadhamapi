const { successResponse } = require("../../utils/response");
const service = require("./contact-enquiries.service");

const submit = async (req, res) => {
  const data = await service.createContactEnquiry(req.body);
  return successResponse(res, "Contact enquiry submitted successfully", data, 201);
};

const list = async (req, res) => {
  const result = await service.getContactEnquiries(req.query);
  return successResponse(res, "Contact enquiries fetched successfully", result.data, 200, result.pagination);
};

module.exports = {
  submit,
  list,
};
