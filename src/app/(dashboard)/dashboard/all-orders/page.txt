import dynamic from "next/dynamic";

const AllOrdersClient = dynamic(() => import("./AllOrdersClient"), {
  ssr: false,
});

const OrdersPage = ({ searchParams }) => {
  return (
    <div>
      <AllOrdersClient searchParams={searchParams} />
    </div>
  );
};

export default OrdersPage;
