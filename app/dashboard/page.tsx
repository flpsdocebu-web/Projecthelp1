import Header from "@/components/Header";
import AdminGuard from "@/components/AdminGuard";
import UploadResourceManager from "@/components/UploadResourceManager";
import DashboardReport from "@/components/DashboardReport";
import DashboardAutoRefresh from "@/components/DashboardAutoRefresh";
import DashboardLiveMetrics from "@/components/DashboardLiveMetrics";
import UploadedResourceAdmin from "@/components/UploadedResourceAdmin";
import DashboardGreeting from "@/components/DashboardGreeting";

export default function Dashboard() {
  return <AdminGuard><main className="dashboard"><Header compact/><section className="dash-shell"><div className="dash-head"><DashboardGreeting/><div className="dash-tools"><DashboardAutoRefresh/><UploadResourceManager/></div></div><DashboardLiveMetrics/><div className="dash-grid"><article className="panel table-panel"><div className="panel-head"><div><strong>Most downloaded resources</strong><span>Top Learning Activity Sheets this month</span></div><DashboardReport/></div><table><thead><tr><th>Resource</th><th>Grade</th><th>Downloads</th><th>Prints</th></tr></thead><tbody><tr className="empty-table-row"><td colSpan={4}>Resource rankings will appear after downloads or prints are recorded.</td></tr></tbody></table></article></div><UploadedResourceAdmin/></section></main></AdminGuard>;
}
