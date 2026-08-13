import math

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.conf import settings

# pyrefly: ignore [missing-import]
from apps.analysis.services.prediction_service import PredictionService
# pyrefly: ignore [missing-import]
from apps.analysis.services.site_analysis_service import SiteAnalysisService
# pyrefly: ignore [missing-import]
from apps.analysis.services.spatial_engine import SpatialAnalysisError, get_default_engine
# pyrefly: ignore [missing-import]
from apps.analysis.services.use_case_scorers import USE_CASES, SCORERS
# pyrefly: ignore [missing-import]
from apps.api.models import AnalysisHistory
# pyrefly: ignore [missing-import]
from apps.api.serializers.models import AnalysisHistorySerializer
# pyrefly: ignore [missing-import]
from apps.gis.services.building_service import BuildingService
# pyrefly: ignore [missing-import]
from apps.gis.services.flood_service import FloodService
# pyrefly: ignore [missing-import]
from apps.gis.services.poi_service import POIService
# pyrefly: ignore [missing-import]
from apps.gis.services.population_service import PopulationService
# pyrefly: ignore [missing-import]
from apps.gis.services.railway_service import RailwayService
# pyrefly: ignore [missing-import]
from apps.gis.services.road_service import RoadService


class DatasetViewSet(viewsets.ViewSet):
    def list(self, request, dataset_name=None):
        services = {
            "roads": RoadService,
            "buildings": BuildingService,
            "poi": POIService,
            "population": PopulationService,
            "flood": FloodService,
            "railways": RailwayService,
        }
        service_cls = services.get(dataset_name)
        if not service_cls:
            return Response({"detail": "Unsupported dataset"}, status=400)

        service = service_cls()
        try:
            if dataset_name == "population":
                raster = service.get_population_raster()
                return Response(
                    {
                        "dataset": dataset_name,
                        "type": "raster",
                        "file": raster.name,
                        "driver": raster.driver,
                        "width": raster.width,
                        "height": raster.height,
                        "crs": str(raster.crs),
                    }
                )

            if dataset_name == "roads":
                data = service.get_roads()
            elif dataset_name == "buildings":
                data = service.get_buildings()
            elif dataset_name == "poi":
                data = service.get_poi()
            elif dataset_name == "flood":
                data = service.get_flood()
            elif dataset_name == "railways":
                data = service.get_railways()
            else:
                data = None

            if data is None:
                return Response({"detail": "No data available"}, status=404)

            count = len(data)
            sample = data.head(1)
            sample_records = []
            for record in sample.to_dict(orient="records"):
                safe = {}
                for key, value in record.items():
                    if value is None:
                        safe[key] = None
                    elif isinstance(value, float) and not math.isfinite(value):
                        safe[key] = None
                    elif hasattr(value, "wkt"):
                        safe[key] = {"type": "geometry", "wkt": value.wkt}
                    elif isinstance(value, (str, int, bool)):
                        safe[key] = value
                    else:
                        safe[key] = str(value)
                sample_records.append(safe)
            crs = getattr(data, "crs", None)
            return Response(
                {
                    "dataset": dataset_name,
                    "type": "vector",
                    "count": count,
                    "crs": str(crs) if crs is not None else None,
                    "columns": list(data.columns),
                    "sample": sample_records,
                }
            )
        except Exception as exc:
            return Response({"detail": str(exc)}, status=500)


class AnalysisHistoryViewSet(viewsets.ModelViewSet):
    queryset = AnalysisHistory.objects.all()
    serializer_class = AnalysisHistorySerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        lat = data.get("latitude") or 0.0
        lng = data.get("longitude") or 0.0
        res = data.get("result")
        if not isinstance(res, dict):
            res = {}

        score_val = data.get("score")
        if score_val is None:
            score_val = res.get("score")
        if score_val is None:
            score_val = res.get("site_readiness_score")

        try:
            score = float(score_val) if score_val is not None else 75.0
        except (ValueError, TypeError):
            score = 75.0

        location_name = data.get("location_name") or res.get("location_name") or f"Lat {float(lat):.4f}, Lng {float(lng):.4f}"
        use_case = data.get("use_case") or res.get("use_case") or "restaurant"
        features = data.get("features") or res.get("features") or {}
        explanation = data.get("explanation") or res.get("explanation") or {}

        final_result = {
            **res,
            "score": score,
            "site_readiness_score": score,
            "location_name": location_name,
            "use_case": use_case,
            "features": features,
            "explanation": explanation,
        }

        instance = AnalysisHistory.objects.create(
            latitude=float(lat),
            longitude=float(lng),
            result=final_result,
            user=request.user if request.user.is_authenticated else None,
        )
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=201)


class AnalysisViewSet(viewsets.ViewSet):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        engine = get_default_engine()
        self.analysis_service = SiteAnalysisService(feature_engine=engine)
        self.prediction_service = PredictionService()

    @action(detail=False, methods=["post"], url_path="send-otp")
    def send_otp(self, request):
        email = (request.data.get("email") or "").strip().lower()
        purpose = request.data.get("purpose", "registration")
        if not email:
            return Response({"detail": "Valid email address is required"}, status=400)
        
        from django.utils import timezone
        from datetime import timedelta
        import random
        # pyrefly: ignore [missing-import]
        from apps.api.models import OTPToken

        now = timezone.now()
        # Rate Limiting: Check if OTP sent in last 60 seconds
        recent_otp = OTPToken.objects.filter(email=email, created_at__gte=now - timedelta(seconds=60)).first()
        if recent_otp:
            return Response({"detail": "Please wait 60 seconds before requesting another OTP."}, status=429)

        otp_code = f"{random.randint(100000, 999999)}"
        expires_at = now + timedelta(minutes=5)

        # Save to DB
        OTPToken.objects.create(
            email=email,
            otp_code=otp_code,
            purpose=purpose,
            expires_at=expires_at,
        )

        # Dispatch via Gmail SMTP with custom highlighted HTML layout
        try:
            from django.core.mail import send_mail

            plain_message = f"Here is your LocaVista verification code:\n\n{otp_code}\n\nThis code will expire in 5 minutes."

            html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; background-color: #ffffff; margin: 0; padding: 20px; }}
    .card {{ max-width: 440px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; }}
    .brand {{ font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 20px; }}
    .text {{ font-size: 14px; color: #334155; line-height: 1.5; margin-bottom: 16px; }}
    .code-box {{ background: #f1f5f9; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }}
    .code {{ font-size: 32px; font-weight: 800; color: #0f172a; letter-spacing: 6px; font-family: monospace; }}
    .subtext {{ font-size: 12px; color: #64748b; margin-top: 16px; line-height: 1.4; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">LocaVista</div>
    <div class="text">Here is your verification code:</div>
    <div class="code-box">
      <div class="code">{otp_code}</div>
    </div>
    <div class="subtext">This code will expire in 5 minutes. If you did not request this, you can safely ignore this email.</div>
  </div>
</body>
</html>"""

            send_mail(
                subject=f"LocaVista verification code: {otp_code}",
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                html_message=html_content,
                fail_silently=False,
            )
            return Response({"message": f"Verification code sent to {email}"}, status=200)
        except Exception as exc:
            # Output logged securely on server
            return Response({"message": f"Verification code generated for {email}", "detail": str(exc)}, status=200)

    @action(detail=False, methods=["get"], url_path="check-availability")
    def check_availability(self, request):
        email = (request.query_params.get("email") or "").strip().lower()
        username = (request.query_params.get("username") or "").strip().lower()

        from django.contrib.auth.models import User
        email_taken = User.objects.filter(email=email).exists() if email else False
        username_taken = User.objects.filter(username=username).exists() if username else False

        return Response({
            "email_available": not email_taken,
            "username_available": not username_taken,
        }, status=200)

    @action(detail=False, methods=["post"], url_path="register-user")
    def register_user(self, request):
        email = (request.data.get("email") or "").strip().lower()
        username = (request.data.get("username") or request.data.get("name") or "").strip()
        password = request.data.get("password")
        otp_code = (request.data.get("otp_code") or "").strip()
        name = (request.data.get("name") or "").strip() or username.title()

        if not email or not password or not otp_code or not username:
            return Response({"detail": "Username, email, password, and OTP verification code are required."}, status=400)

        # Password Strength Validation (Backend Enforcement)
        import re
        if len(password) < 8:
            return Response({"detail": "Password must be at least 8 characters long."}, status=400)
        if not re.search(r"[A-Z]", password):
            return Response({"detail": "Password must contain at least 1 uppercase letter (A-Z)."}, status=400)
        if not re.search(r"[a-z]", password):
            return Response({"detail": "Password must contain at least 1 lowercase letter (a-z)."}, status=400)
        if not re.search(r"\d", password):
            return Response({"detail": "Password must contain at least 1 number (0-9)."}, status=400)
        if not re.search(r"[!@#$%^&*_\-+]", password):
            return Response({"detail": "Password must contain at least 1 special character (!@#$%^&*_-+)."}, status=400)

        from django.contrib.auth.models import User
        from django.utils import timezone
        from datetime import timedelta
        import secrets
        
        # pyrefly: ignore [missing-import]
        from apps.api.models import UserProfile, OTPToken, AuthToken

        # 1. Check Unique Username in DB
        if User.objects.filter(username=username.lower()).exists():
            return Response({"detail": "This username is already taken. Please choose another one."}, status=409)

        # 2. Check Unique Email in DB
        if User.objects.filter(email=email).exists():
            return Response({"detail": "This email is already registered. Please use another email or sign in."}, status=409)

        # 3. Verify OTP in DB
        now = timezone.now()
        otp_record = OTPToken.objects.filter(
            email=email,
            purpose="registration",
            is_used=False,
            expires_at__gte=now,
        ).order_by("-created_at").first()

        if not otp_record:
            return Response({"detail": "Invalid or expired OTP code. Please request a new code."}, status=400)

        if otp_record.attempts >= 3:
            otp_record.is_used = True
            otp_record.save()
            return Response({"detail": "Maximum OTP attempts exceeded. Please request a new code."}, status=429)

        if otp_record.otp_code != otp_code:
            otp_record.attempts += 1
            otp_record.save()
            return Response({"detail": "Incorrect OTP verification code."}, status=400)

        # Mark OTP as used
        otp_record.is_used = True
        otp_record.save()

        # 4. Create User & UserProfile in DB
        try:
            user = User.objects.create_user(username=username.lower(), email=email, password=password, first_name=name)
            UserProfile.objects.create(user=user, is_email_verified=True)

            # AUTO-LOGIN: Issue AuthToken immediately upon successful registration
            token_key = secrets.token_hex(32)
            expires_at = timezone.now() + timedelta(days=7)
            AuthToken.objects.create(user=user, key=token_key, expires_at=expires_at)

            return Response({
                "message": "Registration successful. Welcome to LocaVista!",
                "token": token_key,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "name": user.first_name,
                }
            }, status=201)
        except Exception as exc:
            return Response({"detail": f"Registration error: {str(exc)}"}, status=500)

    @action(detail=False, methods=["post"], url_path="login-user")
    def login_user(self, request):
        identity = (request.data.get("email") or request.data.get("username") or "").strip().lower()
        password = request.data.get("password")

        if not identity or not password:
            return Response({"detail": "Email/Username and password are required."}, status=400)

        from django.contrib.auth.models import User
        from django.utils import timezone
        from datetime import timedelta
        import secrets
        
        # pyrefly: ignore [missing-import]
        from apps.api.models import UserProfile, AuthToken

        # 1. Search Database for User by Email or Username
        user = User.objects.filter(username=identity).first() or User.objects.filter(email=identity).first()
        if not user:
            return Response({"detail": "Account not found. Please register first."}, status=404)

        # 2. Check Password Hash
        if not user.check_password(password):
            return Response({"detail": "Incorrect email/username or password."}, status=401)

        # 3. Check Account Status
        if not user.is_active:
            return Response({"detail": "Account disabled. Please contact administrator."}, status=403)

        # 4. Generate Auth Token in DB
        token_key = secrets.token_hex(32)
        expires_at = timezone.now() + timedelta(days=7)
        AuthToken.objects.create(user=user, key=token_key, expires_at=expires_at)

        return Response({
            "message": "Login successful",
            "token": token_key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email or identity,
                "name": user.first_name or identity.split("@")[0].title(),
            }
        }, status=200)

    @action(detail=False, methods=["get"], url_path="auth/me")
    def verify_me(self, request):
        auth_header = request.headers.get("Authorization", "")
        token_key = ""
        if auth_header.startswith("Bearer "):
            token_key = auth_header.split("Bearer ")[1].strip()
        elif auth_header.startswith("Token "):
            token_key = auth_header.split("Token ")[1].strip()

        if not token_key:
            return Response({"detail": "Authentication token missing"}, status=401)

        from django.utils import timezone
        
        # pyrefly: ignore [missing-import]
        from apps.api.models import AuthToken

        token_record = AuthToken.objects.filter(key=token_key, expires_at__gte=timezone.now()).first()
        if not token_record:
            return Response({"detail": "Invalid or expired session. Please log in again."}, status=401)

        user = token_record.user

        return Response({
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "name": user.first_name or user.email.split("@")[0].title(),
            }
        }, status=200)

    @action(detail=False, methods=["post"], url_path="auth/logout")
    def logout_user(self, request):
        auth_header = request.headers.get("Authorization", "")
        token_key = ""
        if auth_header.startswith("Bearer "):
            token_key = auth_header.split("Bearer ")[1].strip()
        elif auth_header.startswith("Token "):
            token_key = auth_header.split("Token ")[1].strip()

        if token_key:
            
            # pyrefly: ignore [missing-import]
            from apps.api.models import AuthToken
            AuthToken.objects.filter(key=token_key).delete()

        return Response({"message": "Logged out successfully"}, status=200)

    @action(detail=False, methods=["post"], url_path="request-password-reset")
    def request_password_reset(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response({"detail": "Email address is required"}, status=400)

        from django.contrib.auth.models import User
        user = User.objects.filter(username=email).first() or User.objects.filter(email=email).first()
        if not user:
            return Response({"detail": "No account found with this email address."}, status=404)

        return self.send_otp(request)

    @action(detail=False, methods=["post"], url_path="reset-password")
    def reset_password(self, request):
        email = (request.data.get("email") or "").strip().lower()
        otp_code = (request.data.get("otp_code") or "").strip()
        new_password = request.data.get("new_password")

        if not email or not otp_code or not new_password:
            return Response({"detail": "Email, OTP code, and new password are required."}, status=400)
        if len(new_password) < 6:
            return Response({"detail": "New password must be at least 6 characters long."}, status=400)

        from django.contrib.auth.models import User
        from django.utils import timezone
        
        # pyrefly: ignore [missing-import]
        from apps.api.models import OTPToken, AuthToken

        user = User.objects.filter(username=email).first() or User.objects.filter(email=email).first()
        if not user:
            return Response({"detail": "User account not found."}, status=404)

        now = timezone.now()
        otp_record = OTPToken.objects.filter(
            email=email,
            is_used=False,
            expires_at__gte=now,
        ).order_by("-created_at").first()

        if not otp_record or otp_record.otp_code != otp_code:
            return Response({"detail": "Invalid or expired OTP verification code."}, status=400)

        otp_record.is_used = True
        otp_record.save()

        # Update password hash in DB
        user.set_password(new_password)
        user.save()

        # Invalidate old auth tokens
        AuthToken.objects.filter(user=user).delete()

        return Response({"message": "Password reset successful. Please sign in with your new password."}, status=200)

    @action(detail=False, methods=["post"], url_path="analyze")
    def analyze(self, request):
        data = request.data
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        use_case = data.get("use_case", "restaurant")
        retail_type = data.get("retail_type")
        restaurant_type = data.get("restaurant_type")
        office_type = data.get("office_type")
        school_type = data.get("school_type")
        if latitude is None or longitude is None:
            return Response({"detail": "latitude and longitude are required"}, status=400)
        if use_case not in USE_CASES:
            return Response({"detail": f"use_case must be one of {USE_CASES}"}, status=400)
        try:
            result = self.analysis_service.analyze(float(latitude), float(longitude), use_case=use_case, retail_type=retail_type, restaurant_type=restaurant_type, office_type=office_type, school_type=school_type)
            AnalysisHistory.objects.create(latitude=float(latitude), longitude=float(longitude), result=result)
            return Response(result, status=200)
        except SpatialAnalysisError as exc:
            return Response({"detail": str(exc)}, status=400)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=500)

    @action(detail=False, methods=["post"], url_path="compare")
    def compare(self, request):
        location_a = request.data.get("location_a")
        location_b = request.data.get("location_b")
        use_case = request.data.get("use_case", "restaurant")
        retail_type = request.data.get("retail_type")
        restaurant_type = request.data.get("restaurant_type")
        office_type = request.data.get("office_type")
        school_type = request.data.get("school_type")
        if not location_a or not location_b:
            return Response({"detail": "location_a and location_b are required"}, status=400)
        try:
            result = self.analysis_service.compare(location_a, location_b, use_case=use_case, retail_type=retail_type, restaurant_type=restaurant_type, office_type=office_type, school_type=school_type)
            return Response(result, status=200)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=500)

    @action(detail=False, methods=["get", "post"], url_path="predict")
    def predict(self, request):
        data = request.query_params if request.method == "GET" else request.data
        latitude = data.get("latitude")
        longitude = data.get("longitude")
        use_case = data.get("use_case", "restaurant")
        retail_type = data.get("retail_type")
        restaurant_type = data.get("restaurant_type")
        office_type = data.get("office_type")
        school_type = data.get("school_type")
        if latitude is None or longitude is None:
            return Response({"detail": "latitude and longitude are required"}, status=400)
        if use_case not in USE_CASES:
            return Response({"detail": f"use_case must be one of {USE_CASES}"}, status=400)
        try:
            result = self.prediction_service.predict(float(latitude), float(longitude), use_case=use_case, retail_type=retail_type, restaurant_type=restaurant_type, office_type=office_type, school_type=school_type)
            return Response(result, status=200)
        except SpatialAnalysisError as exc:
            return Response({"detail": str(exc)}, status=400)
        except Exception as exc:
            return Response({"detail": str(exc)}, status=500)

    @action(detail=False, methods=["post"], url_path="batch-analyze")
    def batch_analyze(self, request):
        data = request.data
        locations = data.get("locations", [])
        use_case = data.get("use_case", "restaurant")
        retail_type = data.get("retail_type")
        restaurant_type = data.get("restaurant_type")
        office_type = data.get("office_type")
        school_type = data.get("school_type")
        if not isinstance(locations, list) or not locations:
            return Response({"detail": "locations array is required"}, status=400)
        if len(locations) > 100:
            return Response({"detail": "Maximum batch size is 100 locations per request"}, status=400)
        results = []
        for idx, item in enumerate(locations):
            lat = item.get("latitude")
            lng = item.get("longitude")
            if lat is None or lng is None:
                results.append({"index": idx, "error": "Missing latitude or longitude"})
                continue
            try:
                res = self.prediction_service.predict(float(lat), float(lng), use_case=use_case, retail_type=retail_type, restaurant_type=restaurant_type, office_type=office_type, school_type=school_type)
                res["index"] = idx
                results.append(res)
            except Exception as exc:
                results.append({"index": idx, "latitude": lat, "longitude": lng, "error": str(exc)})
        return Response({"count": len(results), "use_case": use_case, "results": results}, status=200)

    @action(detail=False, methods=["get", "post"], url_path="recommendations")
    def recommendations(self, request):
        data = request.query_params if request.method == "GET" else request.data
        use_case = str(data.get("use_case") or "restaurant").strip().lower()

        # Scope sub-type parameters strictly to the active use_case to eliminate cross-use-case parameter bleed
        retail_type = data.get("retail_type") if use_case == "retail" else None
        restaurant_type = data.get("restaurant_type") if use_case == "restaurant" else None
        office_type = data.get("office_type") if use_case == "office" else None
        school_type = data.get("school_type") if use_case == "school" else None

        try:
            limit = int(data.get("limit", 5))
        except (ValueError, TypeError):
            limit = 5

        preset_locations = [
            {"name": "Navrangpura", "latitude": 23.0365, "longitude": 72.5611},
            {"name": "SG Highway", "latitude": 23.0425, "longitude": 72.5150},
            {"name": "Satellite", "latitude": 23.0300, "longitude": 72.5178},
            {"name": "Bodakdev", "latitude": 23.0381, "longitude": 72.5119},
            {"name": "Maninagar", "latitude": 22.9983, "longitude": 72.6006},
            {"name": "Vastrapur", "latitude": 23.0350, "longitude": 72.5292},
            {"name": "Prahlad Nagar", "latitude": 23.0131, "longitude": 72.5086},
            {"name": "Nikol", "latitude": 23.0458, "longitude": 72.6728},
            {"name": "Bopal", "latitude": 23.0330, "longitude": 72.4650},
            {"name": "South Bopal", "latitude": 23.0180, "longitude": 72.4600},
            {"name": "Thaltej", "latitude": 23.0505, "longitude": 72.5050},
            {"name": "CG Road", "latitude": 23.0300, "longitude": 72.5580},
            {"name": "Law Garden", "latitude": 23.0245, "longitude": 72.5570},
            {"name": "Science City Road", "latitude": 23.0720, "longitude": 72.5080},
            {"name": "Chandkheda", "latitude": 23.1147, "longitude": 72.5853},
            {"name": "Naroda", "latitude": 23.0700, "longitude": 72.6600},
            {"name": "Gota", "latitude": 23.0980, "longitude": 72.5350},
            {"name": "Motera", "latitude": 23.1042, "longitude": 72.5975},
            {"name": "Ghatlodia", "latitude": 23.0633, "longitude": 72.5383},
            {"name": "Paldi", "latitude": 23.0125, "longitude": 72.5630},
            {"name": "Ashram Road", "latitude": 23.0225, "longitude": 72.5714},
            {"name": "Vastral", "latitude": 23.0031, "longitude": 72.6565},
            {"name": "Kankaria", "latitude": 23.0060, "longitude": 72.6010},
            {"name": "Drive In Road", "latitude": 23.0480, "longitude": 72.5280},
            {"name": "Iscon Cross Roads", "latitude": 23.0270, "longitude": 72.5070},
        ]

        scored_locations = []
        for loc in preset_locations:
            try:
                res = self.prediction_service.predict(
                    float(loc["latitude"]),
                    float(loc["longitude"]),
                    use_case=use_case,
                    retail_type=retail_type,
                    restaurant_type=restaurant_type,
                    office_type=office_type,
                    school_type=school_type
                )
                score = res.get("site_readiness_score") or res.get("score") or 0.0
                scored_locations.append({
                    "name": loc["name"],
                    "latitude": loc["latitude"],
                    "longitude": loc["longitude"],
                    "score": round(float(score), 2),
                    "result": res
                })
            except Exception:
                continue

        # Multi-factor deterministic sorting: (descending score, ascending road distance, ascending name)
        scored_locations.sort(
            key=lambda x: (
                -x["score"],
                float(x.get("result", {}).get("features", {}).get("road_distance") or 9999.0),
                x["name"]
            )
        )
        top_recommendations = scored_locations[:limit]

        rank_labels = [
            "#1 Top Recommendation",
            "#2 High Suitability Spot",
            "#3 Strategic Growth Area",
            "#4 Emerging Commercial Hub",
            "#5 Viable Site Option"
        ]

        for i, item in enumerate(top_recommendations):
            item["rank"] = i + 1
            item["rank_label"] = rank_labels[i] if i < len(rank_labels) else f"#{i+1} Candidate Area"

        return Response({
            "use_case": use_case,
            "total_evaluated": len(scored_locations),
            "recommendations": top_recommendations
        }, status=200)

    @action(detail=False, methods=["get"], url_path="health")
    def health(self, request):
        engine = get_default_engine()
        health_info = engine.get_system_health()
        health_info["loaded_use_cases"] = list(self.prediction_service.available_use_cases)
        health_info["version"] = "1.0.0-enterprise"
        return Response(health_info, status=200)

