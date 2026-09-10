import { useNavigate } from "react-router-dom";

function ProcessingStatus() {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Processing Status</h1>

      <p>Video processing completed.</p>

      <button onClick={() => navigate("/results")}>
        View Results
      </button>
    </div>
  );
}

export default ProcessingStatus;