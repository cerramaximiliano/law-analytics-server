const LawyerCollege = require("../models/LawyerCollege");


exports.getAllLawyerColleges = async (req, res) => {
    try {
        // Build query
        let query = LawyerCollege.find();

        // Field selection
        if (req.query.fields) {
            const fields = req.query.fields.split(',').join(' ');
            query = query.select(fields);
        }

        // Filtering by province
        if (req.query.province) {
            query = query.find({ province: { $regex: new RegExp(req.query.province, 'i') } });
        }

        // Text search on name
        if (req.query.search) {
            query = query.find({ name: { $regex: new RegExp(req.query.search, 'i') } });
        }

        // Advanced filtering
        let queryStr = { ...req.query };
        const excludedFields = ['fields', 'sort', 'page', 'limit', 'search'];
        excludedFields.forEach(field => delete queryStr[field]);

        // Filter by exact match for other fields
        // Convert query string to MongoDB operators
        queryStr = JSON.stringify(queryStr);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|eq|ne|in)\b/g, match => `$${match}`);

        // Apply advanced filters if any exist
        const parsedQuery = JSON.parse(queryStr);
        if (Object.keys(parsedQuery).length > 0) {
            query = query.find(parsedQuery);
        }

        // Sorting
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('name'); // Default sort by name
        }

        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const skip = (page - 1) * limit;

        query = query.skip(skip).limit(limit);

        // Count total documents for pagination metadata
        const totalDocs = await LawyerCollege.countDocuments(query.getFilter());

        // Execute query
        const lawyerColleges = await query;

        // Return response
        return res.status(200).json({
            success: true,
            count: lawyerColleges.length,
            total: totalDocs,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(totalDocs / limit),
                hasNextPage: page * limit < totalDocs,
                hasPrevPage: page > 1
            },
            data: lawyerColleges
        });
    } catch (error) {
        console.error('Error in getAllLawyerColleges:', error);
        return res.status(500).json({
            success: false,
            error: 'Server Error',
            details: error.message
        });
    }
};

exports.getLawyerCollegeByAbbreviation = async (req, res) => {
    try {
        const { abbreviation } = req.params;

        if (!abbreviation) {
            return res.status(400).json({
                success: false,
                error: 'Please provide an abbreviation'
            });
        }

        // Case insensitive search
        const lawyerCollege = await LawyerCollege.findOne({
            abbreviation: { $regex: new RegExp(`^${abbreviation}$`, 'i') }
        });

        if (!lawyerCollege) {
            return res.status(404).json({
                success: false,
                error: `No lawyer college found with abbreviation ${abbreviation}`
            });
        }

        return res.status(200).json({
            success: true,
            data: lawyerCollege
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Server Error',
            details: error.message
        });
    }
};

exports.getLawyerCollegesByProvince = async (req, res) => {
    try {
        const { province } = req.params;

        if (!province) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a province'
            });
        }

        // Case insensitive search
        const lawyerColleges = await LawyerCollege.find({
            province: { $regex: new RegExp(province, 'i') }
        });

        return res.status(200).json({
            success: true,
            count: lawyerColleges.length,
            data: lawyerColleges
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Server Error',
            details: error.message
        });
    }
};

exports.createLawyerCollege = async (req, res) => {
    try {
        const { name, abbreviation, address, province, phone, website } = req.body;

        // Check if college with same abbreviation already exists
        const existingCollege = await LawyerCollege.findOne({ abbreviation });
        if (existingCollege) {
            return res.status(400).json({
                success: false,
                error: `Lawyer college with abbreviation ${abbreviation} already exists`
            });
        }

        const lawyerCollege = await LawyerCollege.create({
            name,
            abbreviation,
            address,
            province,
            phone,
            website
        });

        return res.status(201).json({
            success: true,
            data: lawyerCollege
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                error: messages
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Server Error',
            details: error.message
        });
    }
};


exports.updateLawyerCollege = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, abbreviation, address, province, phone, website } = req.body;

        // Check if college exists
        let lawyerCollege = await LawyerCollege.findById(id);
        if (!lawyerCollege) {
            return res.status(404).json({
                success: false,
                error: `No lawyer college found with id ${id}`
            });
        }

        // If abbreviation is changing, check if new one already exists
        if (abbreviation && abbreviation !== lawyerCollege.abbreviation) {
            const existingCollege = await LawyerCollege.findOne({ abbreviation });
            if (existingCollege) {
                return res.status(400).json({
                    success: false,
                    error: `Lawyer college with abbreviation ${abbreviation} already exists`
                });
            }
        }

        // Update college
        lawyerCollege = await LawyerCollege.findByIdAndUpdate(
            id,
            { name, abbreviation, address, province, phone, website },
            { new: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            data: lawyerCollege
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                error: messages
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Server Error',
            details: error.message
        });
    }
};


exports.deleteLawyerCollege = async (req, res) => {
    try {
        const { id } = req.params;

        const lawyerCollege = await LawyerCollege.findById(id);
        if (!lawyerCollege) {
            return res.status(404).json({
                success: false,
                error: `No lawyer college found with id ${id}`
            });
        }

        await lawyerCollege.remove();

        return res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Server Error',
            details: error.message
        });
    }
};