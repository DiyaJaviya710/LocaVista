from django.urls import path

from apps.api.views.api_views import AnalysisHistoryViewSet, AnalysisViewSet, DatasetViewSet

urlpatterns = [
    path("roads/", DatasetViewSet.as_view({"get": "list"}), {"dataset_name": "roads"}, name="roads"),
    path("buildings/", DatasetViewSet.as_view({"get": "list"}), {"dataset_name": "buildings"}, name="buildings"),
    path("poi/", DatasetViewSet.as_view({"get": "list"}), {"dataset_name": "poi"}, name="poi"),
    path("population/", DatasetViewSet.as_view({"get": "list"}), {"dataset_name": "population"}, name="population"),
    path("flood/", DatasetViewSet.as_view({"get": "list"}), {"dataset_name": "flood"}, name="flood"),
    path("railways/", DatasetViewSet.as_view({"get": "list"}), {"dataset_name": "railways"}, name="railways"),
    path("analyze/", AnalysisViewSet.as_view({"post": "analyze"}), name="analyze"),
    path("compare/", AnalysisViewSet.as_view({"post": "compare"}), name="compare"),
    path("predict/", AnalysisViewSet.as_view({"get": "predict", "post": "predict"}), name="predict"),
    path("batch-analyze/", AnalysisViewSet.as_view({"post": "batch_analyze"}), name="batch_analyze"),
    path("recommendations/", AnalysisViewSet.as_view({"get": "recommendations", "post": "recommendations"}), name="recommendations"),
    path("health/", AnalysisViewSet.as_view({"get": "health"}), name="health"),
    path("send-otp/", AnalysisViewSet.as_view({"post": "send_otp"}), name="send_otp"),
    path("check-availability/", AnalysisViewSet.as_view({"get": "check_availability"}), name="check_availability"),
    path("register-user/", AnalysisViewSet.as_view({"post": "register_user"}), name="register_user"),
    path("login-user/", AnalysisViewSet.as_view({"post": "login_user"}), name="login_user"),
    path("auth/me/", AnalysisViewSet.as_view({"get": "verify_me"}), name="verify_me"),
    path("auth/logout/", AnalysisViewSet.as_view({"post": "logout_user"}), name="logout_user"),
    path("request-password-reset/", AnalysisViewSet.as_view({"post": "request_password_reset"}), name="request_password_reset"),
    path("reset-password/", AnalysisViewSet.as_view({"post": "reset_password"}), name="reset_password"),
    path("history/", AnalysisHistoryViewSet.as_view({"get": "list", "post": "create"}), name="history"),
    path("history/<int:pk>/", AnalysisHistoryViewSet.as_view({"get": "retrieve", "delete": "destroy"}), name="history_detail"),
]

