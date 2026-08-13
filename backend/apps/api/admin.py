from django.contrib import admin
from apps.api.models import AnalysisHistory, SavedLocation, UploadedDataset, UserProfile, OTPToken, AuthToken

admin.site.register(AnalysisHistory)
admin.site.register(UploadedDataset)
admin.site.register(UserProfile)
admin.site.register(SavedLocation)
admin.site.register(OTPToken)
admin.site.register(AuthToken)
