const express = require("express");
const { getAllLawyerColleges,
    getLawyerCollegeByAbbreviation,
    getLawyerCollegesByProvince,
    createLawyerCollege,
    updateLawyerCollege,
    deleteLawyerCollege,
} = require("../controllers/lawyerCollegeController");
const router = express.Router();


router.get('/', getAllLawyerColleges);
router.get('/abbreviation/:abbreviation', getLawyerCollegeByAbbreviation);
router.get('/province/:province', getLawyerCollegesByProvince);
router.post('/', createLawyerCollege);
router.put('/:id', updateLawyerCollege);
router.delete('/:id', deleteLawyerCollege);

module.exports = router;