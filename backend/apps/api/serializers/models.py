from rest_framework import serializers

from apps.api.models import AnalysisHistory, SavedLocation, UploadedDataset, UserProfile


class AnalysisHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalysisHistory
        fields = ["id", "user", "latitude", "longitude", "result", "created_at"]


class UploadedDatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedDataset
        fields = ["id", "name", "file", "uploaded_at"]


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ["id", "user", "organization", "created_at"]


class SavedLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedLocation
        fields = ["id", "user", "name", "latitude", "longitude", "created_at"]
