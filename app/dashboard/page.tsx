import Header from "@/components/Header";
import AdminGuard from "@/components/AdminGuard";
import UploadResourceManager from "@/components/UploadResourceManager";
import ResourceActivityReport from "@/components/ResourceActivityReport";
import DashboardAutoRefresh from "@/components/DashboardAutoRefresh";
import DashboardLiveMetrics from "@/components/DashboardLiveMetrics";
import UploadedResourceAdmin from "@/components/UploadedResourceAdmin";
import DashboardGreeting from "@/components/DashboardGreeting";

export default function Dashboard() {
  return <AdminGuard><main className="dashboard"><Header compact/><section className="dash-shell"><div className="dash-head"><DashboardGreeting/><div className="dash-tools"><DashboardAutoRefresh/><UploadResourceManager/></div></div><DashboardLiveMetrics/><div className="dash-grid"><ResourceActivityReport/></div><UploadedResourceAdmin/></section></main></AdminGuard>;
}
