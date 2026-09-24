from decimal import Decimal

from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LoyaltyAccount, PromoCode


class PromoValidateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=32)
    order_total = serializers.DecimalField(max_digits=10, decimal_places=2)


class PromoValidateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = PromoValidateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            promo = PromoCode.objects.get(code__iexact=ser.validated_data["code"])
        except PromoCode.DoesNotExist:
            return Response(
                {"valid": False, "detail": "Code inconnu."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not promo.is_valid():
            return Response({"valid": False, "detail": "Code expiré ou désactivé."})
        order_total: Decimal = ser.validated_data["order_total"]
        discount = promo.compute_discount(order_total)
        return Response({
            "valid": True,
            "type": promo.type,
            "value": str(promo.value),
            "discount": str(discount),
            "final_total": str(max(Decimal("0.00"), order_total - discount)),
        })


class LoyaltyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        account, _ = LoyaltyAccount.objects.get_or_create(client=request.user)
        return Response({
            "points": account.points,
            "total_spent": str(account.total_spent),
        })
