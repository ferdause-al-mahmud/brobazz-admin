// UserOrderTable.js
import Link from 'next/link';
import React from 'react';

const UserOrderTable = ({ orders }) => {
    return (
        <div className="overflow-x-auto mt-4 w-full">
            <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-100 border-b">
                    <tr>
                        <th className="px-2 sm:px-4 py-2">Order ID</th>
                        <th className="px-2 sm:px-4 py-2">Status</th>
                        <th className="px-2 sm:px-4 py-2">Date</th>
                        <th className="px-2 sm:px-4 py-2">Total Price</th>
                        <th className="px-2 sm:px-4 py-2">Slip</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.length > 0 ? (
                        orders.map(order => (
                            <tr key={order._id} className="border-b">
                                <td className="px-2 sm:px-4 py-2">{order.orderID}</td>
                                <td className="px-2 sm:px-4 py-2">{order.status}</td>
                                <td className="px-2 sm:px-4 py-2">
                                    {new Date(order.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-2 sm:px-4 py-2">${order.total.toFixed(2)}</td>
                                <td className="px-2 cursor-pointer sm:px-4 py-2">
                                    <Link href={`/orders/${order.orderID}`}>Click Here</Link>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="5" className="px-2 sm:px-4 h-[30vh] py-2 text-center">
                                No orders found
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default UserOrderTable;
