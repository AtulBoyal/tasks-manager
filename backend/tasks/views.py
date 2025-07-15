from rest_framework import generics
from .models import Task
from .serializers import TaskSerializer

# Existing view for list/create
class TaskListCreateView(generics.ListCreateAPIView):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

# New view for retrieve/update/delete
class TaskRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
