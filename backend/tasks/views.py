from rest_framework import generics
from rest_framework.response import Response
from django.utils import timezone
from .models import Task
from .serializers import TaskSerializer

# Existing view for list/create
class TaskListCreateView(generics.ListCreateAPIView):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

# New view for retrieve/update/delete
class TaskRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        completed_before = instance.completed

        # Deserialize and validate the data
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        if not completed_before and serializer.validated_data.get('completed') == True:
            # Task is just now being completed — set today's date
            serializer.save(completion_date=timezone.now().date())
        else:
            # Just update normally
            serializer.save()

        return Response(serializer.data)
