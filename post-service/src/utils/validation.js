import joi from "joi";

export const validatePost = (data) => {
  const schema = joi.object({
    content: joi.string().min(3).max(5000).required(),
    title: joi.string().min(3).max(100).required(),
    mediaIds: joi.array(), 
  });

  return schema.validate(data);
};

