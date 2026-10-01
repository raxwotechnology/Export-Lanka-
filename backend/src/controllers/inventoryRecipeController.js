import asyncHandler from 'express-async-handler';
import InventoryRecipe from '../models/InventoryRecipe.js';
import { checkAndApplyEditLimit } from '../utils/editLimitHelper.js';

export const createRecipe = asyncHandler(async (req, res) => {
    const recipe = await InventoryRecipe.create({
        ...req.body,
        createdBy: req.user._id,
        updatedBy: req.user._id,
    });
    const populated = await InventoryRecipe.findById(recipe._id)
        .populate('sourceProductId', 'name productCode unitOfMeasure basePrice costs')
        .populate('destinationProductId', 'name productCode unitOfMeasure basePrice costs');
    res.status(201).json({ success: true, data: populated });
});

export const getRecipes = asyncHandler(async (req, res) => {
    const { search, status } = req.query;
    const filter = {};

    if (search) {
        filter.name = { $regex: search, $options: 'i' };
    }
    if (status) {
        filter.status = status;
    }

    const recipes = await InventoryRecipe.find(filter)
        .populate('sourceProductId', 'name productCode unitOfMeasure basePrice costs')
        .populate('destinationProductId', 'name productCode unitOfMeasure basePrice costs')
        .sort({ createdAt: -1 });

    res.json({ success: true, count: recipes.length, data: recipes });
});

export const getRecipeById = asyncHandler(async (req, res) => {
    const recipe = await InventoryRecipe.findById(req.params.id)
        .populate('sourceProductId', 'name productCode unitOfMeasure basePrice costs')
        .populate('destinationProductId', 'name productCode unitOfMeasure basePrice costs');
    if (!recipe) {
        res.status(404);
        throw new Error('Inventory Recipe not found');
    }
    res.json({ success: true, data: recipe });
});

export const updateRecipe = asyncHandler(async (req, res) => {
    const recipe = await InventoryRecipe.findById(req.params.id);
    if (!recipe) {
        res.status(404);
        throw new Error('Inventory Recipe not found');
    }

    // Enforce 2-time edit limit for Factory Manager
    checkAndApplyEditLimit(recipe, req.user, 'Inventory Recipe');

    Object.assign(recipe, req.body, { updatedBy: req.user._id });
    await recipe.save();

    const populated = await InventoryRecipe.findById(recipe._id)
        .populate('sourceProductId', 'name productCode unitOfMeasure basePrice costs')
        .populate('destinationProductId', 'name productCode unitOfMeasure basePrice costs');

    res.json({ success: true, data: populated });
});

export const deleteRecipe = asyncHandler(async (req, res) => {
    const recipe = await InventoryRecipe.findById(req.params.id);
    if (!recipe) {
        res.status(404);
        throw new Error('Inventory Recipe not found');
    }
    recipe.deletedAt = new Date();
    recipe.status = 'inactive';
    await recipe.save();
    res.json({ success: true, message: 'Inventory Recipe deleted successfully' });
});
