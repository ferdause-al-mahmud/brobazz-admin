"use client";

import { useState, useEffect, useRef } from 'react';
import { IoIosArrowDown, IoIosClose } from "react-icons/io"; // Added IoIosClose for close icon
import { FaFilter } from "react-icons/fa"; // Added FaFilter for filter icon
import { useRouter } from 'next/navigation';
const FilterMenu = ({

    sortBy, setSortBy,
    availability, setAvailability,
    minPrice, setMinPrice,
    maxPrice, setMaxPrice,
    applyPriceFilter, resetFilters,
    handleSortChange
}) => {
    const router = useRouter();
    const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(false);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false); // State for mobile filter visibility

    const priceFilterRef = useRef(null); // Reference for the price filter dropdown
    const mobileFilterRef = useRef(null); // Reference for mobile filter modal
    // Close the price filter dropdown when clicking outside
    // In the Filters component, update the click outside handling
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (priceFilterRef.current && !priceFilterRef.current.contains(event.target)) {
                setIsPriceFilterOpen(false);
            }
            if (mobileFilterRef.current && !mobileFilterRef.current.contains(event.target)) {
                setIsMobileFilterOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div>
            <div className="md:hidden p-4">
                <button
                    className="border rounded p-2 px-5 flex items-center justify-center w-full"
                    onClick={() => setIsMobileFilterOpen(true)}
                >
                    <FaFilter className="mr-2" />
                    Filter & Sort
                </button>

                {/* Mobile Filter Modal */}
                {isMobileFilterOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-10 flex items-center justify-center">
                        <div
                            ref={mobileFilterRef}
                            className="bg-white p-6 w-[90%] max-w-[400px] rounded-lg shadow-lg relative"
                        >
                            {/* Close Icon */}
                            <button
                                className="absolute top-4 right-4 text-2xl"
                                onClick={() => setIsMobileFilterOpen(false)}
                            >
                                <IoIosClose />
                            </button>

                            {/* Filter Options */}
                            <div className="flex flex-col gap-6">
                                <div>
                                    <label htmlFor="sortBy" className="block text-gray-700 mb-2">Sort by:</label>
                                    <select
                                        id="sortBy"
                                        value={sortBy}
                                        onChange={handleSortChange}
                                        className="border rounded p-2 w-full">
                                        <option value="">Select</option>
                                        <option value="lowToHigh">Low to High</option>
                                        <option value="highToLow">High to Low</option>
                                        <option value="newest">Newest</option>
                                        <option value="oldest">Oldest</option>
                                        {/* <option value="bestSelling">Best Selling</option> */}
                                    </select>
                                </div>

                                {/* // In the price filter dropdown component */}
                                <div className="relative" ref={priceFilterRef}>
                                    <button
                                        className="border rounded p-2 px-1 flex items-center w-full justify-between"
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent click from propagating to the document
                                            setIsPriceFilterOpen(!isPriceFilterOpen);
                                        }}
                                    >
                                        Price
                                        <span className={`ml-2 transform ${isPriceFilterOpen ? 'rotate-180' : 'rotate-0'}`}>
                                            <IoIosArrowDown />
                                        </span>
                                    </button>

                                    {isPriceFilterOpen && (
                                        <div className="absolute top-[42px] mt-2 bg-[#f3f3f3] border border-gray-300 p-4 shadow-lg">
                                            <div className="flex gap-4">
                                                <div className="mb-2">
                                                    <input
                                                        placeholder="From"
                                                        id="minPrice"
                                                        type="number"
                                                        value={minPrice}
                                                        onChange={(e) => setMinPrice(e.target.value)}
                                                        className="border py-2 px-4 w-full rounded"
                                                    />
                                                </div>
                                                <div className="mb-2">
                                                    <input
                                                        placeholder="To"
                                                        id="maxPrice"
                                                        type="number"
                                                        value={maxPrice}
                                                        onChange={(e) => setMaxPrice(e.target.value)}
                                                        className="border py-2 px-4 w-full rounded"
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                className="p-3 text-center w-full btn-primary bg-[#242833] text-white border-transparent hover:bg-white hover:text-black hover:border-black border transition-all duration-300"
                                                onClick={applyPriceFilter}
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    )}
                                </div>


                                {/* Availability Filter */}
                                {/* <div>
                                    <label htmlFor="availability" className="block text-gray-700 mb-2">Availability:</label>
                                    <select
                                        id="availability"
                                        value={availability}
                                        onChange={(e) => setAvailability(e.target.value)}
                                        className="border rounded p-2 w-full">
                                        <option value="">Select</option>
                                        <option value="inStock">In Stock</option>
                                        <option value="outOfStock">Out of Stock</option>
                                    </select>
                                </div> */}

                                {/* Reset Button */}
                                <button
                                    className="bg-black text-white hover:bg-white hover:text-black py-2 px-4 rounded mt-4"
                                    onClick={resetFilters}
                                >
                                    Reset Filters
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Normal Filters (for medium and larger screens) */}
            <div className="hidden md:flex justify-between items-center p-4">
                {/* Left Side: Sort By Dropdown */}
                <div className="flex items-center gap-6">
                    <div>
                        <label htmlFor="sortBy" className="mr-2 text-gray-700">Sort by:</label>
                        <select
                            id="sortBy"
                            value={sortBy}
                            onChange={handleSortChange}
                            className="border rounded p-2">
                            <option value="">Select</option>
                            <option value="lowToHigh">Low to High</option>
                            <option value="highToLow">High to Low</option>
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                            {/* <option value="newest">Newest</op
                         */}
                        </select>
                    </div>

                    {/* Price Filter (Custom Dropdown) */}
                    <div className="relative" ref={priceFilterRef}>
                        <button
                            className="border rounded p-2 px-5 flex items-center"
                            onClick={() => setIsPriceFilterOpen(!isPriceFilterOpen)}
                        >
                            Price
                            <span className={`ml-2 transform ${isPriceFilterOpen ? 'rotate-180' : 'rotate-0'}`}>
                                <IoIosArrowDown />
                            </span>
                        </button>

                        {isPriceFilterOpen && (
                            <div className="absolute left-0 mt-2 z-50 w-[300px] bg-[#f3f3f3] border border-gray-300 p-4 shadow-lg">
                                <div className="flex gap-4">
                                    <div className="mb-2">
                                        <input
                                            placeholder="From"
                                            id="minPrice"
                                            type="number"
                                            value={minPrice}
                                            onChange={(e) => setMinPrice(e.target.value)}
                                            className="border py-2 px-4 w-full rounded"
                                        />
                                    </div>
                                    <div className="mb-2">
                                        <input
                                            placeholder="To"
                                            id="maxPrice"
                                            type="number"
                                            value={maxPrice}
                                            onChange={(e) => setMaxPrice(e.target.value)}
                                            className="border py-2 px-4 w-full rounded"
                                        />
                                    </div>
                                </div>
                                <button
                                    className="p-3 text-center w-full btn-primary bg-[#242833] text-white border-transparent hover:bg-white hover:text-black hover:border-black border transition-all duration-300"
                                    onClick={() => {
                                        applyPriceFilter();
                                        setIsPriceFilterOpen(false);
                                    }}
                                >
                                    Apply
                                </button>

                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Availability Dropdown */}
                <div className="flex items-center">
                    {/* <label htmlFor="availability" className="mr-2 text-gray-700">Availability:</label>
                    <select
                        id="availability"
                        value={availability}
                        onChange={(e) => setAvailability(e.target.value)}
                        className="border rounded p-2 mr-4">
                        <option value="">Select</option>
                        <option value="inStock">In Stock</option>
                        <option value="outOfStock">Out of Stock</option>
                    </select> */}
                    <div className="flex justify-end items-center">
                        <button
                            className="py-1 border-b-2 border-black px-4 hover:border-b-4"
                            onClick={resetFilters}
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterMenu;
