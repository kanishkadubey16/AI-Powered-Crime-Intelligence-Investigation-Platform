import { useNavigate } from "react-router-dom";
import Button from "../components/common/Button";
import { RiArrowLeftLine } from "react-icons/ri";

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center p-8">
      <p className="text-8xl font-black text-slate-800">404</p>
      <h1 className="text-2xl font-bold text-slate-200 mt-4">Page Not Found</h1>
      <p className="text-slate-500 mt-2 mb-8">The page you're looking for doesn't exist.</p>
      <Button icon={<RiArrowLeftLine />} onClick={() => navigate("/")}>
        Back to Dashboard
      </Button>
    </div>
  );
};

export default NotFound;
