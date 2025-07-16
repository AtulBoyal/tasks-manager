from django.contrib.auth.models import models

class Task(models.Model):
    name = models.CharField(max_length=255)
    factor = models.CharField(max_length=20)
    last_date = models.DateField()
    completed = models.BooleanField(default=False)
    completion_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return self.name
