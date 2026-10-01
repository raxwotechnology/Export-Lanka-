import asyncHandler from 'express-async-handler';
import Category from '../models/Category.js';

const resolveParentCategoryId = async (parentCategoryInput, currentCategoryId = null, defaultType = 'product', userId = null) => {
    if (!parentCategoryInput || typeof parentCategoryInput !== 'string') {
        return null;
    }

    const trimmed = parentCategoryInput.trim();
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') {
        return null;
    }

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(trimmed);

    if (isObjectId) {
        if (currentCategoryId && String(currentCategoryId) === trimmed) {
            return null;
        }
        const existing = await Category.findById(trimmed);
        return existing ? existing._id : null;
    }

    // Treat as category name: first check if a category with this name already exists
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let existingByName = await Category.findOne({
        name: { $regex: new RegExp(`^${escaped}$`, 'i') },
        deletedAt: null,
    });

    if (existingByName) {
        if (currentCategoryId && String(currentCategoryId) === String(existingByName._id)) {
            return null;
        }
        return existingByName._id;
    }

    // If no existing category found with this name, auto-create a new parent category
    let baseCode = trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
    if (!baseCode) baseCode = 'CAT';
    let code = baseCode.slice(0, 10);
    let counter = 1;
    while (await Category.findOne({ code })) {
        code = `${baseCode.slice(0, 6)}-${counter++}`;
    }

    const newCategory = await Category.create({
        name: trimmed,
        code,
        type: defaultType || 'product',
        isActive: true,
        createdBy: userId,
    });

    return newCategory._id;
};

export const createCategory = asyncHandler(async (req, res) => {
    const parentCategoryId = await resolveParentCategoryId(
        req.body.parentCategory,
        null,
        req.body.type,
        req.user?._id
    );

    const category = await Category.create({
        ...req.body,
        parentCategory: parentCategoryId,
        createdBy: req.user._id,
    });

    const populated = await Category.findById(category._id).populate('parentCategory', 'name code');
    res.status(201).json({ success: true, data: populated });
});

export const getCategories = asyncHandler(async (req, res) => {
    const { search, type, isActive, parentCategory } = req.query;
    const filter = {};

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } },
        ];
    }
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (parentCategory) {
        filter.parentCategory = parentCategory === 'null' ? null : parentCategory;
    }

    const categories = await Category.find(filter)
        .populate('parentCategory', 'name code')
        .sort({ displayOrder: 1, name: 1 });

    res.json({ success: true, count: categories.length, data: categories });
});

export const getCategoryById = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id).populate('parentCategory', 'name code');
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }
    res.json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req, res) => {
    let updateData = { ...req.body };

    if ('parentCategory' in updateData) {
        updateData.parentCategory = await resolveParentCategoryId(
            updateData.parentCategory,
            req.params.id,
            updateData.type,
            req.user?._id
        );
    }

    const category = await Category.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
    ).populate('parentCategory', 'name code');

    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }
    res.json({ success: true, data: category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        res.status(404);
        throw new Error('Category not found');
    }
    category.deletedAt = new Date();
    category.isActive = false;
    await category.save();
    res.json({ success: true, message: 'Category deleted' });
});