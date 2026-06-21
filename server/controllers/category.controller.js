import * as categoryService from '../services/category.service.js';

export async function listHandler(req, res, next) {
  try {
    const tree = req.query.tree === 'true';
    const data = await categoryService.listByUser(req.userId, { tree });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getByIdHandler(req, res, next) {
  try {
    const category = await categoryService.getById(req.userId, req.params.id);
    res.json(category);
  } catch (err) {
    next(err);
  }
}

export async function createHandler(req, res, next) {
  try {
    const category = await categoryService.create(req.userId, req.body);
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(req, res, next) {
  try {
    const category = await categoryService.update(req.userId, req.params.id, req.body);
    res.json(category);
  } catch (err) {
    next(err);
  }
}

export async function deleteHandler(req, res, next) {
  try {
    await categoryService.deleteById(req.userId, req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
